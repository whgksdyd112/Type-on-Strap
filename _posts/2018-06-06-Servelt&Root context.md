---
layout: post
title: Servlet & Root Context
description: Servlet Context와 Root Context의 미묘한 차이와, 종종 발생하는 interceptor가 작동 하지 않는 이유
feature-img: "assets/img/pexels/computer.jpeg"
tags: [Spring, Web]
---

스프링 프로젝트를 사용하면 아래와 같은 파일을 확인할 수 있을 것이다.

```xml
<!-- web.xml -->
<web-app>

    <listener>
        <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
    </listener>

    <context-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>/WEB-INF/app-context.xml</param-value>
    </context-param>

    <servlet>
        <servlet-name>app</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value></param-value>
        </init-param>
        <load-on-startup>1</load-on-startup>
    </servlet>

    <servlet-mapping>
        <servlet-name>app</servlet-name>
        <url-pattern>/app/*</url-pattern>
    </servlet-mapping>

</web-app>
```

`<context-param>`  여기서 설정해 주는 부분이 `Root WebApplicationContext` ,

`<servlet>`에 해당하는 부분이 `Servlet WebApplicationContext`이다.



#### Servlet Context

Controllers, viewResolver와 같이 web과 관련된 설정들이 들어가는 곳



#### Root Context

Datasource, service와 같이 business logic과 관련된 설정들이 들어가는 곳

 

![Image of a glass on a book]({{ site.baseurl }}/assets/img/post/mvc-context-hierarchy.png)

[Spring doc](https://docs.spring.io/spring/docs/current/spring-framework-reference/web.html#mvc)에서 가져온 이미지가 위의 내용들을 잘 설명해주고 있다.

여기서 `Servelt Context`는 `Root Context`의 `bean`을 참조할 수 있지만, 반대의 경우는 불가는 하다. 이 때문에 필자가 최근 겪은 문제가 있다.

`Context`에 대한 이해가 부족한채로 스프링 프로젝트를 진행던 중  `Interceptor`를 이용하고 싶었기에, `Root Context`에서 해당 설정을 해주었다. 하지만 전혀 작동하지 않았다. 인터넷에 돌아다니는 여러 글들을 참조하며 `<mvc:interceptors>`, `<interceptors>`의 태그를 이용하며 시도해봐도 작동을 전혀 하지않았다. 한참의 시간을 들일 후에야 문제는 `Context` 설정에 있었음을 깨닫게 되었다.

해당 프로젝트에서 `annotation-driven`방식을 이용하고 있었는데.

##### Servlet Context

```xml
<context:component-scan base-package="egovframework">
    <context:include-filter type="annotation" expression="org.springframework.stereotype.Controller"/>
    <context:exclude-filter type="annotation" expression="org.springframework.stereotype.Service"/>
    <context:exclude-filter type="annotation" expression="org.springframework.stereotype.Repository"/>
</context:component-scan>
```

##### Root Context

```xml
<context:component-scan base-package="egovframework">
    <context:include-filter type="annotation" expression="org.springframework.stereotype.Service"/>
    <context:include-filter type="annotation" expression="org.springframework.stereotype.Repository"/>
    <context:exclude-filter type="annotation" expression="org.springframework.stereotype.Controller"/>
</context:component-scan>
```

각각 위의 구문을 포함하고 있었는데, 차이를 보면 `Controller`는 `Servlet Context`에서 포함하고, 나머지는 `Root Context`에 `bean`으로 등록하고 있다. 앞에서 설명한 기능에 맞게 잘 나뉘어 설정이 되어있는 상태다.

이 상태에서 `Root Context`는 `Servlet Context`에 설정된 `Controller bean`을 가져올 수 없어 아무런 동작을 하지 않았던 것이다. `Interceptor`와 관련된 설정을 `Servlet Context`에 옮긴 후에야 동작하는 것을 확인 할 수 있었다.