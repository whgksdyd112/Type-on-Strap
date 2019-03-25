---
layout: post
title: Stored Procedure에 관한 고찰
description: Web Service를 구축하면서 stored procedure 사용에 관한 고찰
feature-img: "assets/img/post/gears.jpg"
tags: [Database, MySQL]
---

>   본 글은 Spring과 MySQL을 이용한 웹 서비스 개발을 하고 난 뒤에 들었던 생각을 정리한 글로, 아래의 내용은 MySQL과 관련해서 이해해 주시길 부탁드립니다.

### Stored Procedure?

```
CREATE PROCEDURE procedure_name(IN parameter)
BEGIN
    SQL1;
    SQL2;
END;

CALL procedure_name(parameter);
```

위와 같은 형태로 sql에서 미리 정의 해놓은 절차를 함수 처럼 불러서 쓰는 기능이다.

### Why did I used it?

시간 단위로 사용량이 쌓이는 데이터 구조를 가지고 있었고, 데이터를 분석해서 이상 사용량을 감지하여 *event log*를 남기는 로직이 필요했다. 과거 데이터베이스 수업을 들을 때, 데이터베이스에서 단순히 데이터만 가져오는 데 그치지 않고 데이터 처리 성능을 높이기 위해 *stored procedure*나 *aggregation function*같은 기능들이 추가 된 것이라는 교수님 말씀이 생각났다. 그래서 좋은 성능을 위해, 또한 그 당시 처음으로 규모있는 데이터를 다루면서 *index*를 통한 성능개선에 한창 열을 올리고 있기 때문이기도 했던 것 같다.

### What is the problem?

사용하면서 무엇이 불편했는지, 어떤 점이 좋지 않았는지 얘기해 보겠다.

##### Error Handling

```
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    /* do something here */
END;
```

*procedure*안에서 에러가 발생할 경우 처리를 위해, 위와 같은 문장을 활용했다. 쿼리에서 어떤 에러들이 발생할 수 있는지를 알고 있다면 큰 문제가 아니겠지만, 모른다면 어떤 에러 때문에 쿼리 실행이 멈췄는지 파악하기 어렵다 (`GET DIAGNOSTICS CONDITION`이 존재하지만, 하위 버전에서는 사용할 수 없었다).

##### Architecture

*Spring*을 사용하면 대게 MVC 패턴을 사용하기 마련이다. 이 때 DB는 보통 model 부분에 해당하게 된다. DB에서 *stored procedure*를 이용하면서, 꽤 복잡한 비즈니스 로직을 DB에서도 일부 맡게 되었다. 이는 시스템 디자인적으로 별로 좋지 않은 구조 인듯하다. 시스템 개발 도중에 문제가 발생하면, DB sql문을 함께 찾아봐야 했는데, 코드를 읽는 것보다 훨신 가독성이 떨어졌고 수정이 불편했다.

##### Debug

코드를 작성할 때와 달리, 부분 부분을 의미를 표현하기 위해 다른 함수로 분리하는 등의 리팩토링을 하기가 껄끄러웠고 테스트 하기도 쉽지 않았다. 그렇기에 장황한 쿼리들이 많이 작성되었고, 이는 디버깅 시간의 증가를 불러왔다.

### Conclusion

그렇다면, *stored procedure*는 사용하면 안되는 것인가?

항상 절대적인 것은 없다고 생각한다. 위에서 주로 단점들을 열거했지만, *stored procedrue*는 무시 못할 큰 장점을 가지고 있다. *index*가 잘 활용될 수 있는 상황에서 빠른 속도와 적은 데이터 전송이라는 성능 개선을 얻을 수 있다. 위에서 언급한 이유들로 *stored procedure*를 자주 사용하지 않겠지만, 성능 개선이 필요하다면 부분적으로 사용을 고려할 것이다.

### References

<https://softwareengineering.stackexchange.com/questions/65742/stored-procedures-a-bad-practice-at-one-of-worlds-largest-it-software-consulting>

