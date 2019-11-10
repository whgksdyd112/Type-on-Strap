---
layout: post
title: Storm topology 이해하기 - 2
description: storm에서 tuple 처리과정 이해하기
feature-img: 'assets/img/post/apache-storm.png'
tags: [Java, Storm]
---

Storm에서는 **[Tuple](<https://storm.apache.org/releases/current/javadocs/org/apache/storm/tuple/Tuple.html>)**을 이용해서 spout과 bolt 사이에 데이터를 전달한다. 이번 글을 통해 spout과 bolt를 작성해 보면서, spout에서 처리된 Tuple이 storm에서 어떻게 처리되는지 파악해보도록 하자.

### Spout 작성하기

```java
@Slf4j
public class SentenceSpout implements IRichSpout {

  private int index;
  private SpoutOutputCollector collector;
  private ArrayList<String> sentences;
  
  public SentenceSpout(ArrayList<String> sentences) {
    this.sentences = sentences;
  }

  @Override
  public void open(Map conf, TopologyContext context, SpoutOutputCollector collector) {
    log.info("open");
    this.index = 0;
    this.collector = collector;
  }

  @Override
  public void nextTuple() {
    if (index < sentences.size()) {
      log.info("nextTuple");
      collector.emit(new Values(sentences.get(index), index), index);
      index++;
    }
  }

  @Override
  public void ack(Object msgId) {
    log.info("ack "+ msgId);
  }

  @Override
  public void fail(Object msgId) {
    log.info("fail " + msgId);
  }

  @Override
  public void declareOutputFields(OutputFieldsDeclarer declarer) {
    log.info("declareOutputFields");
    declarer.declare(new Fields("sentence", "index"));
  }

  @Override
  public Map<String, Object> getComponentConfiguration() {
    log.info("getComponentConfiguration");
    return null;
  }

  @Override
  public void close() {
    log.info("close");
  }

  @Override
  public void activate() {
    log.info("activate");
  }

  @Override
  public void deactivate() {
    log.info("deactivate");
  }
}
```

Storm의 처리 과정을 간단히 확인해보기 위해서, String 배열을 받아 처리하고 함수 호출을 로그로 트래킹하는 간단한 Spout을 작성했다.

Spout을 topology에 등록하면, *getComponentConfiguration*과 *declareOutputFields*를 실행시킨다.

- *getComponentConfiguration*
  - spout의 설정을 세팅하는 부분으로, 설정을 추가하고 싶을 때는 주로 *[Config](<https://storm.apache.org/releases/current/javadocs/org/apache/storm/Config.html>)*를 활용해서 작성을 하면된다.
- *declareOutputFields*
  - spout에서 내보내는 Tuple의 schema를 지정하는 부분이다. 해당 부분과 emit되는 Tuple의 내용이 다르면 에러가 발생한다.

Topology가 실행되고 종료될 때 spout은 *open* &rarr; *activate* &rarr; *deactivate* &rarr; *close* 순으로 호출이 된다. 메소드 명이 역할을 잘 설명하고 있기 때문에, 추가 설명을 넘어가도록 하겠다.

Spout에서 Tuple의 흐름을 관리하는데 중요한 역할을 하는 메소드는, *nextTuple*, *ack* 그리고 *fail*이다.

- *nextTuple*
  - spout이 활성화되면 계속해서 불리게 되는 메소드로, topology에 Tuple을 내보내는 역할을 한다. 위에서는 배열의 들어있는 String을 emit하는 역할을 하고 있다. Acker의 경우 id를 가지고 Tuple을 tracking하면서 ack, fail을 알려주기 때문에, 신뢰성을 보장하려면 emit할 때 id를 함께 선언해줘야 한다.
- *ack*
  - spout에서 emit된 Tuple이 완료 되었을 때, 호출되는 메소드이다. Storm cluster상에서 Acker가 Tuple을 트래킹하면서 역할이 완료되면, spout에 알려준다. 보통의 경우 spout은 신뢰성 보장을 위해, tuple이 ack 되기 전까지 메모리에 보유하고 있다가, ack 된 후에 메모리에서 해제한다.
- *fail*
  - spout에서 emit된 Tuple이 정상적으로 처리 되지 못 했을 때 호출되는 메소드이다. 보통의 경우 신뢰성을 보장하기 위해, fail된 Tuple을 다시 emit하여 정상처리될 수 있도록 작성한다.

### Bolt 작성하기

```java
@Slf4j
public class SplitBolt implements IRichBolt {

  private OutputCollector collector;

  @Override
  public void prepare(Map stormConf, TopologyContext context, OutputCollector collector) {
    log.info("prepare");
    this.collector = collector;
  }

  @Override
  public void execute(Tuple input) {
    log.info("execute " + input);

    String setence = input.getStringByField("sentence");
    for (String word : setence.split(" ")) {
      collector.emit(input, new Values(word));
    }

    collector.ack(input);
  }

  @Override
  public void cleanup() {
    log.info("cleanup");
  }

  @Override
  public void declareOutputFields(OutputFieldsDeclarer declarer) {
    log.info("declareOutputFields");
    declarer.declare(new Fields("word"));
  }

  @Override
  public Map<String, Object> getComponentConfiguration() {
    log.info("getComponentConfiguration");
    return null;
  }
}
```

Tuple에서 setence를 받아서 word를 emit하는 간단한 bolt를 작성하였다. 여기서도 *declareOutputFields*, 와 *getComponentConfiguration*은 spout과 동일한 역할을 한다. 다만 emit을 하지 않는 경우에는 *declareOutputFields*은 아무것도 하지 않도록 비워두면 된다. bolt에서 중요한 로직은 *execute*이다.

- *execute*
  - Tuple을 받아서 처리하는 로직이 구현되는 부분이다. 해당 부분에서 *emit*, *ack*, *fail*, *reportError*의 메소드를 호출하여, Tuple의 상태를 처리한다. 다음 볼트로 Tuple을 넘겨주기 위해서 *emit*을 호출해야 하는데, 이 때 input으로 들어온 Tuple을 함께 넣어서 처리해줘야, spout에서 나온 Tuple 처리의 신뢰성을 보장할 수 있다. 또한 위에서 언급한 것처럼, spout에서 ack되지 않은 Tuple을 들고 있기 때문에 ack를 호출 해줘야 메모리 누수를 막을 수 있다.

### Tuple이 처리되는 과정

```java
builder.setSpout(SPOUT, new SentenceSpout(setences));

// SPOUT -> FIRST_BOLT
builder.setBolt(FIRST_BOLT, new SplitBolt(), 1).shuffleGrouping(SPOUT);

// FIRST_BOLT -> SECOND_BOLT
builder.setBolt(SECOND_BOLT, new IgnoreBolt(), 2).shuffleGrouping(FIRST_BOLT);
```

Spout에서 emit된 Tuple을 몇 번의 bolt를 거쳐서 처리된다. 현재 작성된 로직을 보면, SetenceSpout &rarr; SplitBolt &rarr; IgnoreBolt ('#'으로 시작하는 word의 경우 fail 하고 나머지의 경우 ack되도록 로직을 작성하였다) 순으로 Tuple이 전달되게 된다. 해당 과정을 Tuple tree를 그려보며 자세히 알아보도록 하자.

- *"A B C D E"*가 처리되는 과정

  ```
  A B C D E ---+--- A --- acked
               +--- B --- acked
               +--- C --- acked
               +--- D --- acked
               +--- E --- acked
  ```

  spout에서 발생된 *"A B C D E"*는 SplitBolt에서 각각 분리되어, IgnoreBolt로 전달 될 것이다. SplitBolt에서 anchor로 input을 활용했기 때문에, IgnoreBolt에서 모두 ack 된 후에야 spout의 ack 메소드가 호출 된다. 따라서, tuple tree로 연결된 모든 tuple들이 ack되어야 메모리 누수를 막을 수 있다. 만약 anchor를 활용하지 않았다면, SplitBolt에서 ack되었을 때, spout의 ack 메소드가 호출된다.

- *"A B C D #E"*

  ```
  A B C D #E ---+--- A  --- acked
                +--- B  --- acked
                +--- C  --- acked
                +--- D  --- acked
                +--- #E --- failed
  ```

  spout에서 발생된 *"A B C D #E"*는 SplitBolt에서 각각 분리되어, IgnoreBolt로 전달 될 것이다.  이 때, *"#E"*가 들어간 볼트는 fail를 호출할 것이고, 이는 spout의 fail 메소드를 호출하게 된다. Tuple tree로 연결 된 것중에 하나라도 fail하면, spout에서 발생한 해당 Tuple은 fail된 것으로 처리된다. 마찬가지로, anchor를 활용하지 않는다면 위와 같은 tuple tree가 그려지지 않을 것이고, fail 처리되어도 spout에 전달되지 않는다.

- emit하기 전에 ack를 할 경우

  ```java
  public void execute(Tuple input) {
      log.info("execute " + input);
  
      collector.ack(input);
  
      String setence = input.getStringByField("sentence");
      for (String word : setence.split(" ")) {
          collector.emit(input, new Values(word));
      }
  }
  ```

  이런 excute를 작성한다면, anchor를 사용하지 않았을 때와 동일하다. emit된 Tuple들의 ack, fail 여부는 spout의 ack, fail여부와는 관련이 없게 된다.

### References

<https://storm.apache.org/>

[조대협의 블로그 "**빅데이타/스트리밍 데이타 처리**"](<https://bcho.tistory.com/category/%EB%B9%85%EB%8D%B0%EC%9D%B4%ED%83%80/%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%B0%8D%20%EB%8D%B0%EC%9D%B4%ED%83%80%20%EC%B2%98%EB%A6%AC>)