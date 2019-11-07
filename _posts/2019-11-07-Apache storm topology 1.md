---
layout: post
title: Storm topology 이해하기 - 1
description: Storm tutorial
feature-img: 'assets/img/post/apache-storm.png'
tags: [Java, Storm]
---

### Apache Storm이란?

![Apache Storm flor]({{ site.baseurl }}/assets/img/post/storm-flow.png)

Apache Storm은 실시간으로 대용량 데이터를 분산 처리하는 시스템이다.

### Storm Topology

```java
@Slf4j
public class TestTopology {

  private static final String SPOUT = "testSpout";
  private static final String FIRST_BOLT = "firstBolt";
  private static final String SECOND_BOLT = "secondBolt";
  private static final String TOPOLOGY = "testTopology";

  public static void main(String[] args) {
    TopologyBuilder builder = new TopologyBuilder();

    ArrayList<String> setences = new ArrayList<>();
    setences.add("A B C");
    setences.add("A D E");
    setences.add("B F G");
    setences.add("H I J K");
    setences.add("B K A");

    builder.setSpout(SPOUT, new SetenceSpout(setences));

    // SPOUT -> FIRST_BOLT
    builder.setBolt(FIRST_BOLT, new SplitBolt(), 1).shuffleGrouping(SPOUT);

    // FIRST_BOLT -> SECOND_BOLT
    builder.setBolt(SECOND_BOLT, new IgnoreBolt(), 2).shuffleGrouping(FIRST_BOLT);

    Config conf = new Config();
    LocalCluster cluster = new LocalCluster();
    cluster.submitTopology(TOPOLOGY, conf,builder.createTopology());    
    // StormSubmitter.submitTopology(TOPOLOGY, conf,builder.createTopology());   
    log.info("storm cluster started"); 
  }
}
```

**Topology**는 storm에서 멈추지 않고 계속 실행되는 하나의 task 이고, spout과 bolt를 DAG처럼 연결하여 하나의 워크플로우를 나타낸다. MapReduce의 Job과 비슷한 개념으로 생각하면 된다.

Topology는 *TopologyBuilder*를 사용하여 생성하면 된다.

```java
builder.setSpout(SPOUT, new SetenceSpout(setences));
```

윗 부분을 통해 spout을 설정해준다. **Spout**은  topology의 데이터 소스이다. Topology의 로직이 spout에서 나온 데이터로부터 시작하는 것이다. `setSpout(id, spout)`을 통해 spout에 id를 부여한다.

```java
builder.setBolt(FIRST_BOLT, new SplitBolt(), 1).shuffleGrouping(SPOUT);
builder.setBolt(SECOND_BOLT, new IgnoreBolt(), 2).shuffleGrouping(FIRST_BOLT);
```

여기서는 bolt를 설정해준다. **Bolt**는 spout을 통해 들어온 데이터를 가공하는 로직을 처리한다. Spout과 유사하게 `setBolt(id, bolt, workers)`를 통해 bolt에 id를 부여하고 해당 볼트를 몇개의 *worker*에서 실행 시킬지 정한다. `shuffleGrouping(sourceId)`를 통해 해당 bolt에 데이터 공급원을 정한다. 이곳에는 spout 혹은 bolt가 위치 할 수 있다.  *Grouping*의 경우 몇 가지 종류가 있는데 지금은 bolt의 데이터 공급원 정도로만 이해하고 넘어가고, 자세한 추후에 다루도록 하자.

```java
Config conf = new Config();
```

**Config**를 통해서 topology에 대한 몇가지 설정들을 추가할 수 있다. *worker*의 갯수, *timout* 등의 설정들이 존재해서 환경에 맞추어 설정을 해주면 된다.

```java
LocalCluster cluster = new LocalCluster();
cluster.submitTopology(TOPOLOGY, conf, builder.createTopology());    
// StormSubmitter.submitTopology(TOPOLOGY, conf, builder.createTopology());  
```

입맛에 맞게 만든 topology를 이제 클러스터 환경에서 실행시키면 완료가 된다. Topology는 storm 클러스터가 구성된 환경에서 실행 될 수 있는데, 로컬 환경에서 테스트 할 수 있도록 *LocalCluster*를 제공한다. 실제 환경에서는 주석 처리된 부분과 같이 코드를 작성하면 된다.

### 그리고...

간단한 예시 코드를 통해 topology와 구성 요소들을 간략하게 설명했다. 다음 내용을 통해 spout, bolt와 topology 설정들을 코드를 실행시키면서 파악해보자.

### References

<https://storm.apache.org/>

[조대협의 블로그 "**빅데이타/스트리밍 데이타 처리**"](<https://bcho.tistory.com/category/%EB%B9%85%EB%8D%B0%EC%9D%B4%ED%83%80/%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%B0%8D%20%EB%8D%B0%EC%9D%B4%ED%83%80%20%EC%B2%98%EB%A6%AC>)