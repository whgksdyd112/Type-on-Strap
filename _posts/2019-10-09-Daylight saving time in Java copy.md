---
layout: post
title: Daylight saving time in Java
description: Java 사용시 DST로 인해 생기는 문제들
feature-img: "assets/img/post/dst.jpg"
tags: [Java]
---

최근 작업을 하던 중 아래와 같은 에러를 마주하였다.

```java
org.joda.time.IllegalInstantException: Illegal instant due to time zone offset transition (daylight savings time 'gap')
```

이러한 에러가 왜 발생했는지 알아보자

### Daylight Saving Time?

우선 문제를 파악하기 위해 Daylight saving time (이하 DST)에 대해서 알아 보아야 한다.

DST란 흔히 썸머 타임으로 알려진 제도로, 하절기에 표준시를 몇 시간 가량 앞당긴 뒤에 하절기가 끝나면 원래대로 돌려 놓는 것을 말한다. (자세한 내용은 [위키](https://ko.wikipedia.org/wiki/%EC%9D%BC%EA%B4%91_%EC%A0%88%EC%95%BD_%EC%8B%9C%EA%B0%84%EC%A0%9C)를 참고하자)

그렇다면, 도대체 무엇이 문제인가?

하절기가 끝나면 앞당겼던 시간을 다시 되돌려야 한다. 예를 들어 하절기에 1시간을 앞당겼다면, 하절기가 끝날 때 1시간을 늦춰 원래 표준시와 동일하게 유지한다. 1시간을 늦출 때, 1시간 가량의 시간 공백이 발생하게 된다. 그렇기 때문에 해당 Timezone에 존재하지 않는 시간대가 생기게 된다.

![Image of a DST table]({{ site.baseurl }}/assets/img/post/dst-table.png)

위는 `America/Santiago` timezone의 DST 테이블이다.

### With Joda Time

위의 표를 보면 2019년 9월 8일 0시는 존재하지 않고

```java
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.LocalDateTime;

public class DstJodaTimeTest {

  public static void main(String[] args) {
    LocalDateTime dt = LocalDateTime.parse("2019-09-08T00:00:00.000");
    DateTime zdt = dt.toDateTime(DateTimeZone.forID("America/Santiago"));
    System.out.println(zdt);
  }
}
```

위와 같은 코드를 작성하면 아래와 같은 에러가 날 것이다.

```java
Exception in thread "main" org.joda.time.IllegalInstantException: Illegal instant due to time zone offset transition (daylight savings time 'gap'): 2019-09-08T00:00:00.000 (America/Santiago)
	at org.joda.time.chrono.ZonedChronology.localToUTC(ZonedChronology.java:157)
	at org.joda.time.chrono.ZonedChronology.getDateTimeMillis(ZonedChronology.java:122)
	at org.joda.time.chrono.AssembledChronology.getDateTimeMillis(AssembledChronology.java:133)
	at org.joda.time.base.BaseDateTime.<init>(BaseDateTime.java:257)
	at org.joda.time.DateTime.<init>(DateTime.java:532)
	at org.joda.time.LocalDateTime.toDateTime(LocalDateTime.java:753)
	at com.joddev.test.DstJodaTimeTest.main(DstJodaTimeTest.java:12)
```

위의 에러에 대한 설명은 [링크](http://joda-time.sourceforge.net/faq.html)에서 좀 더 확인해 볼 수 있다.

> ***Possible solutions may be as follows:***
>
> - *Use `LocalDateTime`, as all local date-times are valid.*
>
> - *When converting a `LocalDate` to a `DateTime`, then use `toDateTimeAsStartOfDay()` as this handles and manages any gaps.*
>
> - *When parsing, use `parseLocalDateTime()` if the string being parsed has no time-zone.*

위를 참고해서 수정하면

```java
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.LocalDate;

public class DstJodaTimeTest {

  public static void main(String[] args) {
    LocalDate dt = LocalDate.parse("2019-09-08");
    DateTime zdt = dt.toDateTimeAtStartOfDay(DateTimeZone.forID("America/Santiago"));
    System.out.println(zdt);			// 2019-09-08T01:00:00.000-03:00
    System.out.println(zdt.minusHours(1));	// 2019-09-07T23:00:00.000-04:00
  }
}
```

위의 코드를 실행시키면, 존재하지 않는 2019년 9월 8일 0시가 아닌 2019년 9월 8일 1시가 출력될 것이다. 또한 여기서 1시간을 빼면, 2시간 전으로 돌아가고 time offset이 변하는 것을 유의하자.

### With Java8 Time

java8부터 기본적으로 제공하는 `java.time`을 사용했을 때는 어떤 일이 벌어지는지 확인해보자.

```java
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public class DstJava8TimeTest {

  public static void main(String[] args) {
    LocalDateTime dt = LocalDateTime.of(2019,9,8,0,0);
    ZonedDateTime zdt = dt.atZone(ZoneId.of("America/Santiago"));
    System.out.println(zdt);              	
    System.out.println(zdt.minusHours(1));
  }
}
```

위의 코드를 실행 시켰을 때, 어떠한 결과가 나오는가? 필자의 경우 자바버전에 따라 다른 2가지의 결과가 나왔다.

1. DST가 반영되지 않은 경우

   ```java
   // jdk1.8.0_171
   System.out.println(zdt);              	// 2019-09-08T00:00-03:00[America/Santiago]
   System.out.println(zdt.minusHours(1));  // 2019-09-07T23:00-03:00[America/Santiago]
   ```

2. DST가 반영된 경우

   ```java
   // jdk1.8.0_221
   System.out.println(zdt);              	// 2019-09-08T01:00-03:00[America/Santiago]
   System.out.println(zdt.minusHours(1));  // 2019-09-07T23:00-04:00[America/Santiago]
   ```

`java.time`의 경우 java 버전이 릴리즈 됨에 따라 타임존이 업데이트 된다. java 버전에 따라 다른 타임존 상황이 적용될 수 있으니 주의하여 사용하도록 하자. joda time library 경우에는 library 버전에 따라 타임존이 업데이트 되므로, 환경별 자바 버전에 대해 달라지는 일은 없을 것이다.

### References

https://ko.wikipedia.org/wiki/%EC%9D%BC%EA%B4%91%EC%A0%88%EC%95%BD_%EC%8B%9C%EA%B0%84%EC%A0%9C

https://www.timeanddate.com/time/zone/chile/santiago

<http://joda-time.sourceforge.net/faq.html>



