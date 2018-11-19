---
layout: post
title: 406 Not Acceptable in Spring
description: 406 Not Acceptable이 발생했을 때의 원인과 대처법
feature-img: "assets/img/post/406-not-acceptable.jpg"
tags: [Spring, Web, HTTP]
---

Spring boot 프로젝트를 진행중 `406 Not Acceptable` 이라는 오류를  만나게 되었다. 몇 시간의 삽질을 통해 깨달은 바를 간략하게 정리하고 넘어가려 한다.

<br>

### 406 Not Acceptable이란?

`406 error`란 서버에서  `Accept` 등의 헤더에 적혀있는 형식을 생성해 낼 수 없을 때 발생하는 에러이다

<br>

### 문제 원인

```java
org.springframework.web.HttpMediaTypeNotAcceptableException: Could not find acceptable representation
```

Spring에서 `Content-Type`에 선언된 형식으로 변환이 불가능 할 경우 위의 로그와 함께, `406 Not Acceptable` 에러를 발생시킨다. Spring에서는 데이터를 `HttpMessageConverter`를 이용해서 변환한다.

작업 방식은 다음과 같다.

1. 응답하려는 `MediaType`을 식별한다.
2. **등록된 `HttpMessageConverter`에서 `MediaType`으로 데이터를 변환 시킬 수 있는 녀석을 찾는다.**
3. 해당 `HttpMessageConverter`를 이용하여 데이터를 변환시킨다.

문제는 보통 2번에서 발생한다. 2번을 해결하기 위해서는 적절한 `HttpMessageConverter`를 Spring 프로젝트에 등록시켜주면 된다

<br>

### 해결 방법

가장 흔한 원인은 `jackson` 라이브러리가 없는 경우다. 

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-core</artifactId>
    <version>2.4.1</version>
</dependency>
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.4.1.1</version>
</dependency>
<dependency>
    <groupId>org.codehaus.jackson</groupId>
    <artifactId>jackson-core-asl</artifactId>
    <version>1.9.13</version>
</dependency>
<dependency>
    <groupId>org.codehaus.jackson</groupId>
    <artifactId>jackson-mapper-asl</artifactId>
    <version>1.9.13</version>
</dependency>
```

이런식으로 library를 추가 해주면된다. 이 경우 `<mvc:annotation-driven>`이 선언 되어있으면 자동으로 `HttpMessageConverter`도 추가해준다.



간혹 직접 컨버터를 추가해야 될 경우가 있는데, 아래와 같은 방법으로 추가해주면 된다.

```java
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(new ResourceHttpMessageConverter(true));
    }

}
```

[Spring Doc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/converter/HttpMessageConverter.html)에 가면 `All Known Implementing Classes`에서 `MediaType`에 따라 필요한 `HttpMessageConverter`를 찾는데 도움이 될 것이다.

- `MappingJackson2HttpMessageConverter `: json 형식을 지원하는데 필요
- `ResourceHttpMessageConverter`: 파일 형식을 지원하는데 필요

<br>

### References

https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406

https://stackoverflow.com/questions/7462202/spring-json-request-getting-406-not-acceptable

https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/converter/HttpMessageConverter.html