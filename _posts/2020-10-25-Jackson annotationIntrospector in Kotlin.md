---
layout: post
title: Json으로 직렬화시 마스킹하기
description: Kotlin에서 Custom Jackson AnnotationIntrospector 사용하기
feature-img: 'assets/img/post/mountain-2248686_1920.jpg'
tags: [Kotlin, Jackson]
---

개발을 진행하다보면, 다양한 로그를 남기게 된다. 

최근 개발을 진행하면

개발을 진행하다보면 다양한 로그를 남기게 된다. 최근 로그를 남기면서 일부 정보는 마스킹 하고자 하는 요구사항이 있어서, 해당 문제를 해결하며 겪은 문제를 공유하고자 한다.

### 어떤 로그를 남기려 했는가?

Kotlin을 이용해 구현된 API 서버 접근 기록을 RequestBody와 함께 남기려 했고 민감한 데이터는 필터처리가 필요 했다.

### JsonProperty.Access 이용하기

첫 번째로 사용하려 했던 방법은 `@JsonProperty`의 `access` 속성을 이용하여, serialize시에는 데이터가 반영이 되지 않도록 구현을 하였다.

```kotlin
data class Sample(
    val a: Int
    @get:JsonProperty(access = JsonProperty.Access.WRITE_ONLY) val b: Int
)
```

전체 객체들을 점검하며, 마스킹이 필요한 필드들에 위와 같이 어노테이션을 붙여주었다. 위와 같이 작성 하였을 때, 로그에 이용되는 이외의 상황에서 의도치 않게 데이터가 필터되는 상황이 발생하게 된다. 프로젝트에서 [Jackson](https://github.com/FasterXML/jackson)을 사용해서 serialize/deserialize를 진행하고 있었기 때문에 response로 활용되는 클래스 필드에 어노테이션이 붙어 있을 경우, 응답에서 해당 필드가 제외된 채로 클라이언트에 전달이 되게 된다.

작업을 진행한 프로젝트에서는 request를 위한 클래스와, response를 위한 클래스를 분리해서 사용하고 있어서, request 클래스만 해당 어노테이션을 사용하면 관련 문제를 어느 정도 피할 수 있긴 했다. 하지만 외부 API로 요청이 필요할 때 request와 response 클래스를 나눠서 관리하고 있는데, 이 때 실수로 request 클래스에 위와 같은 어노테이션을 붙이는 문제도 발생할 것이라고 생각했다.

그래서 일반적으로 데이터를 json으로 serialize/deserialize 하는 상황에 영향 받지 않을 다른 방법이 필요했다.

### Custom AnnotationIntrospector 구현하기

Jackson 라이브러리에서는 커스텀 어노테이션을 추가해서 이용할 수 있도록 인터페이스를 제공하고 있다. 로깅시 마스킹이 필요함을 알려주기 위한 어노테이션을 새로 만들고, 로깅시에만 해당 어노테이션을 인지하고 마스킹하도록 구조를 작성하였다.

```kotlin
// 로깅시 마스킹이 필요함을 알려주는 annotation
@Target(AnnotationTarget.FIELD)
@Retention(AnnotationRetention.RUNTIME)
annotation class Masked(
    val value: String = "XXX" // 어떤 값으로 마스킹 될지 설정하는 값
)
```

마스킹이 필요함을 알려주는 `@Masked` 어노테이션을 준비한다.

```kotlin
class MaskingSerializer(
    private val maskedValue: String
): JsonSerializer<Any>() {
  override fun serialize(value: Any, gen: JsonGenerator, serializers: SerializerProvider?) {
    gen.writeString(maskedValue)
  }
}
```

serialize시에 마스킹 값으로 변경해서 채울 수 있도록 serizlier를 준비한다.

```kotlin
class MaskedLoggingIntrospector: NopAnnotationIntrospector() {
  override fun findSerializer(am: Annotated?): Any? {
    if (am == null) {
      return null
    }

    val ann = am.getAnnotation(Masked::class.java) ?: return null
    return MaskingSerializer(maskedValue = ann.value)
  }
}
```

*AnnotationIntrospector*에서 다양한 interface를 제공하는데, 여기서는 필드에 달린 annotation에 따라 특수한 serializer를 사용하려고 알려주는 `findSerializer`를 이용해서 구현하였다.

이제 테스트를 해보자

```kotlin
class MaskedLoggingIntrospectorTest {
  data class A(
      @get:JsonProperty("aa") val a: Int,
      @Masked val b: String
  )

  @Test
  fun `어노테이션 붙였을 때, 마스킹 되는지 테스트`() {
    val obj = A(a = 1, b = "str")
    val maskingMapper = ObjectMapper().setAnnotationIntrospector(MaskedLoggingIntrospector())
    println(maskingMapper.writeValueAsString(obj)) // {"a":1,"b":"XXX"}
      
    val normalMapper = ObjectMapper()
    println(normalMapper.writeValueAsString(obj))  // {"aa":1,"b":"str"}
  }
}
```

이제 위처럼 *MaskedLoggingIntrospector*를 이용할 경우에만, 마스킹이 잘 되는 것을 확인할 수 있다. 하지만 기존에 활용하고 있던 *Jackson*의 annotation들이 더이상 적용되지 않는 것을 확인할 수 있다.

*ObjectMapper*를 만들면 기본적으로 *JacksonAnnotationIntrospector*로 설정이 되어 있고, 해당 클래스가 annotation을 인지하고 그에 따라 json으로 만들어준다. 위와 같은 문제를 해결하기 위해서는 *AnnotationIntrospectorPair*를 활용해주면 된다.

```kotlin
class MaskedLoggingIntrospectorTest {
  data class A(
      @get:JsonProperty("aa") val a: Int,
      @Masked val b: String
  )

  @Test
  fun `Jackson annotation과 @Masked 동시에 지원되는지 테스트`() {
    val obj = A(a = 1, b = "str")
    val mapper = ObjectMapper()
    val originAnnotationIntrospector = mapper.serializationConfig.annotationIntrospector
    mapper.setAnnotationIntrospector(
        AnnotationIntrospector.pair(MaskedLoggingIntrospector(), originAnnotationIntrospector)
    )
    println(maskingMapper.writeValueAsString(obj)) // {"aa":1,"b":"XXX"}
  }
}
```

*ObjectMapper*의 기존 *annotationIntrospector*를 가져와서 *pair*로 연결해서 사용해주면, 여러 *Introspector*를 적용할 수 있다. 일반적으로 *Kotlin*에서 *Jackson*을 사용할 경우 *KotlinModule*을 추가해서 사용하고 있을텐데, 그 경우에 *AnnotationIntrospector*를 가져오면

<div style="text-align:center"><img alt="Kotlin Annotation Introspector in Debugger" src="{{ site.baseurl }}/assets/img/post/kotlin-annotation-introspector.png"></div>

이렇게 3개의 *AnnotationIntrospector*가 엮여있는 모습을 확인할 수 있다. 이미 추가된 모듈을 덮어씌워 의도치 않는 상황이 발생하지 않도록 기존 *AnnotationIntrospector*에 잘 추가해서 사용해주자.

### References

https://github.com/FasterXML/jackson-docs/wiki/AnnotationIntrospector

https://fasterxml.github.io/jackson-databind/javadoc/2.9/com/fasterxml/jackson/databind/AnnotationIntrospector.html

https://stackoverflow.com/questions/34965201/customize-jackson-objectmapper-to-read-custom-annotation-and-mask-fields-annotat/37538768

