---
layout: post
title: CloudWatch Metrics 활용해보기
description: CloudWatch Metrics에서 제공하는 기능들
feature-img: 'assets/img/post/owl-in-trees.jpg'
tags: [AWS, CloudWatch]
---

### CloudWatch Metrics란?

CloudWatch Metrics는 AWS에서 동작하는 어플리케이션의 상태를 모니터링하기 위해 쓰는 도구이다. 메트릭 마다 하나의 지표를 가지고 있으며, 시계열 그래프를 그려준다.

### Custom Metric

기본적으로 ec2 등을 사용하면, cpu 상태 등의 정보가 CloudWatch로 전달된다. 해당 정보를 시계열 그래프 형태로 모니터링이 가능하며, 경보 설정도 해줄 수 있다. 때론 기본적으로 제공하는 정보 이외에 더 많은 정보를 제공하고 싶을 때가 있을 것이다. 필요시 원하는 데이터를 넣어 줄 수 있다.

```bash
# 데이터 집어 넣기
aws cloudwatch put-metric-data --namespace namespace --metric-name test-metric
  --dimensions name=A,size=small --value 10 --timestamp 2020-04-22T12:40:00
```

<div style="text-align:center"><img alt="CloudWatch custom namespace" src="{{ site.baseurl }}/assets/img/post/cloudwatch-custom-namespace.png"></div>

새로운 메트릭이 생성되고 그래프로 확인해 볼 수 있다.

<div style="text-align:center"><img alt="CloudWatch custom metrics 1" src="{{ site.baseurl }}/assets/img/post/cloudwatch-custom-metrics-1.png"></div>

### Put Metric Data

위에서 메트릭 데이터를 집어넣기 위해 활용 했던 데이터를 좀 더 자세히 살펴보자. 

*namespace*라는 네임스페이스로 *test-metric*이라는 이름을 가진 메트릭을 생성했다. 해당 메트릭은 *name*, *size*로 구분 될 수 있다. 또한 해당 시간대에 10의 값을 넣어 준 것이다. 위에 첨부한 사진만 봐도 이해가 갈 것이다.

[CloudWatch 가격정책](<https://aws.amazon.com/ko/cloudwatch/pricing/>)을 확인하면, **PutMetricData**을 사용할 때마다, 요금이 부과되는 것을 확인해 볼 수 있다. 호출을 적게 하기위해서, 여러개의 데이터를 그룹해서 보내주는 방법이 있다.

```bash
# 통계 데이터 집어 넣기
aws cloudwatch put-metric-data --namespace namespace --metric-name test-metric
  --dimensions name=A,size=large --timestamp 2020-04-22T12:40:00
  --statistic-values SampleCount=3,Sum=30,Minimum=5,Maximum=15
```

위와 같이 통계 수치를 넘겨주어, 여러개의 데이터를 묶어서 보내줄 수 있다. 메트릭을 볼 때, 통계 기간을 1초, 5초 부터 길게는 30일 까지 잡을 수 있으므로, 필요에 따라 적당히 묶어서 보내도록 하자.

더 자세한 사용법은, [링크](<https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html>)에서 확인할 수 있다.

### Math Expression

*Math expression* 기능을 활용해서, 여러개의 메트릭을 합치거나 활용하여 새로운 데이터를 만드는 것이 가능하다. 다양한 함수들을 지원 하지만 여기서는 그 중 일부만 다뤄보도록 하자. 

<div style="text-align:center"><img alt="CloudWatch custom metrics base" src="{{ site.baseurl }}/assets/img/post/cloudwatch-custom-metrics-base.png"></div>

우선 위와 같이 3개의 메트릭이 준비된 상태이다. 위의 사진에서 Math expression을 클릭하여 추가할 수 있다.

***SEARCH***

>  SEARCH(' {Namespace, DimensionName1, DimensionName2, ...} SearchTerm', 'Statistic', Period)

검색 조건에 맞는 메트릭들만 뽑아서 보여주는 기능이다.

<div style="text-align:center"><img alt="CloudWatch custom metrics search" src="{{ site.baseurl }}/assets/img/post/cloudwatch-custom-metrics-search.png"></div>

*SEARCH('{namespace, name, size} MetricName="test-metric" name="A"', 'Sum', 60)*의 결과이다.

메트릭 이름이 *test-metric*이고 dimension 중 *name*이 *A*인 조건을 만족 하는 메트릭들에 대하여, 1분 간격으로 합계를 차트로 그려준다.

***SORT***

> SORT(Metrics, SortFunction, SortOrder, Limit)

주어진 메트릭들의 합계, 최소, 최대, 평균에 대해서 정렬해서 상위 결과를 보여주는 기능이다.

<div style="text-align:center"><img alt="CloudWatch custom metrics search" src="{{ site.baseurl }}/assets/img/post/cloudwatch-custom-metrics-sort.png"></div>

*SORT(METRICS(), SUM, DESC, 2)*의 결과이다.

*METRICS()*는 현재 포함되어 있는 모든 메트릭을 가져오는 함수이다. 즉, 모든 메트릭에서 합계가 가장 큰 2개의 메트릭을 가져와서 차트로 그려준 것이다. *METRICS()* 대신 위의 *SEARCH*를 이용해도 된다.

이외에도, *SUM*, *STDDEV*, *ABS* 등 많은 함수들이 존재한다. 더 자세한 내용은, [링크](<https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html>)에서 확인할 수 있다.

### References

https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html

https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html

