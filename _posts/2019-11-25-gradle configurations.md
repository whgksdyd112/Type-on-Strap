---
layout: post
title: Gradle configurations
description: gradle에서 사용되는 configurations 이애하기
feature-img: 'assets/img/post/elephant.jpg'
tags: [Gradle, Java]
---

Gradle 프로젝트에서, lombok을 사용하기 위해 mvnrepository를 방문해서 최신버전 [링크](<https://mvnrepository.com/artifact/org.projectlombok/lombok/1.18.10>)를 따라 들어갔다.

```groovy
// https://mvnrepository.com/artifact/org.projectlombok/lombok
providedCompile group: 'org.projectlombok', name: 'lombok', version: '1.18.10'
```

위를 그대로 복사해서 `build.gradle`에 붙여 넣으니 아래와 같은 에러가 발생했다.

```
Could not find method providedCompile() for arguments [{group=org.projectlombok, name=lombok, version=1.18.10}] on object of type org.gradle.api.internal.artifacts.dsl.dependencies.DefaultDependencyHandler.
```

### Quick Solution

1. add '*war*' plugin

   ```groovy
   // build.gradle
   plugins {
       ...
       id 'war'
   }
   ```

2. define `providedCompile` configuration

   ```groovy
   // build.gradle
   configurations { providedCompile }
   
   sourceSets.main.compileClasspath += configurations.providedCompile
   sourceSets.test.compileClasspath += configurations.providedCompile
   sourceSets.test.runtimeClasspath += configurations.providedCompile
   ```

3. change configuration

   ```groovy
   // build.gradle
   dependencies {
       compileOnly group: 'org.projectlombok', name: 'lombok', version: '1.18.10'
   }
   ```

### Gradle Configuration

> A `Configuration` represents a group of artifacts and their dependencies.

**Configuration**은 의존성 그룹으로 이해하면 되고, *dependencies*를 통해 의존성 그룹에 라이브러리를 추가해주는 개념으로 이해하면 된다.

```groovy
// build.gradle
...
for (config in configurations) {
    println config
}
```

위의 `build.gradle`을 실행시키면 아래와 같은 결과가 나온다.

<div style="text-align:center"><img src="{{ site.baseurl }}/assets/img/post/gradle-configurations.png" /></div>

***Gradle 4.10.3*** ([link](<https://docs.gradle.org/4.10.3/userguide/building_java_projects.html#example_declaring_dependencies>)) 기준으로 작성된 결과이며, 여기서 자주 사용되는 것들을 알아보자.

- `compileOnly` : 컴파일 할때 필요한 라이브러리 그룹

- `implementation` (`compile`) : 프로젝트 컴파일하고 실행시키는데 필요한 라이브러리 그룹
- `runtimeOnly` (`runtime`) : 프로젝트를 실행할 때 필요한 라이브러리 그룹
- `testCompileOnly` :  프로젝트의 테스트를 컴파일 할 때 필요한 라이브러리 그룹
- `testImplementation` (`testCompile`) : 프로젝트의 테스트를 컴파일 하고 실행시키는데 필요한 라이브러리 그룹
- `testRuntimeOnly` (`testRuntime`) : 프로젝트의 테스트를 실행시키는데 필요한 라이브러리 그룹

이들 각각은 의존성을 가지거나, 합쳐져서 `classpath` configuration을 이루게 되는데 아래의 코드를 통해 확인해 볼 수 있다.

```groovy
// build.gradle

...

dependencies {
    compileOnly group: 'org.projectlombok', name: 'lombok', version: '1.18.10'

    runtimeOnly group: 'com.fasterxml.jackson.core', name: 'jackson-core', version: '2.10.1'

    implementation group: 'com.google.guava', name: 'guava', version: '28.1-jre'

    testCompileOnly group: 'org.assertj', name: 'assertj-core', version: '3.14.0'

    testRuntime group: 'org.apache.camel', name: 'camel-test', version: '2.24.2'

    testImplementation group: 'junit', name: 'junit', version: '4.12'
}

for (config in configurations) {
    println config
    for (dependency in config.allDependencies) {
        println dependency.name
    }
}
```

몇 가지만 살펴보면, `testImplementation`은 테스트를 컴파일 하기 위한 의존성을 들고 있고 (`testImplementation` + `implementation`), `runtimeClasspath`는 실행시 필요한 의존성을 모두 들고 있다 (`implementation` + `runtimeOnly`).

라이브러리의 역할에 맞게 configuration을 잘 설정해 주어야, 불필요하게 결과 파일이 거대해지거나 원하는 의존성이 제대로 주입되지 않는 상황을 방지할 수 있을 것이다.

### References

<https://docs.gradle.org/>

<https://kwonnam.pe.kr/wiki/gradle/dependencies>

<https://stackoverflow.com/questions/13925724/providedcompile-without-war-plugin?rq=1>

