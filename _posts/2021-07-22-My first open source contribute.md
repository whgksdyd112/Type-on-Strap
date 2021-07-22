---
layout: post
title: 오픈 소스에 기여해보기
description: SQS에서 moto에 기여하기 까지
feature-img: 'assets/img/post/old-town-6238228.jpg'
tags: [Kotlin, Jackson]
---

회사에서 개발 환경에서 AWS 서비스를 간단하게 모킹해서 사용하기 위해 Localstack을 사용하고 있다. 이러한 환경에서 오픈소스에 버그를 발견하고, 수정하는 PR을 날린일에 대해서 얘기해보려 한다.

### 어떤 현상이 발생했나

회사에서 다양한 피쳐들의 테스트를 동시에 진행하기 위해서, 피쳐별로 Localstack을 이용해서 테스트 환경이 갖춰져있다. 이중 SQS를 이용하는 테스트의 경우 일부 환경에서 메시지가 원할하게 전달되지 않는 현상이 발견되었다. 여러 환경에서 테스트해보고 2가지 이상한 상황을 찾게 되었다.

1. 반복해서 SQS의 메시지를 읽어들일때, 연속해서 호출하면 같은 것이 불러질 때도 있고, 아닐 때도 있다.
2. 적당히 오래된, SQS에 대해서 메시지 전송이 되지 않는다.

### SQS 동작 이해하기

이 2가지 동작이 이해가 되지 않아서, SQS의 작동 방식에 대해서 찾아보았다. 그 동안 달려있던 SQS에 대해 한번도 찾아보지 않았다는 것에 상당히 반성을 하게 되었는데..

<div style="text-align:center"><img alt="SQS visibility timeout" src="{{ site.baseurl }}/assets/img/post/sqs-visibility-timeout-diagram.png"></div>

우선 SQS에는 `visibility timeout` 설정이 존재한다. 한번 읽어들인 메시지가 반복해서 전달되는 것을 막기위해 존재하는 설정으로, `visibility timeout`으로 설정된 시간만큼 메시지가 노출되지 않는다. 즉 SQS에 들어간 메시지는 큐에 남아서, `visibility timeout` 시간마다 다시 읽어들일 수 있는 상태로 변경된다. 이러한 설정 때문에, 위에서 1번과 같은 문제가 발생했던 것이다.

그렇다면, SQS에 들어온 메시지는 삭제가 되지 않는것인가? SQS에서 메시지가 삭제되는 형태 3가지에 대해서 알아보자.

첫 번째는, 명시적으로 큐에 있는 메시지를 제거하는 것이다. 메시지를 제거하는 명령을 SQS 내리면, 그 메시지는 더이상 노출되지 않는다. 

두 번째는, `dead-letter-queue`를 설정하는 것이다. 위의 옵션을 설정해 놓으면, 정해진 threshold 값 만큼 메시지를 읽었는데 큐에 남아있는 상태면, 기존 큐에서 제거하고 `dead-letter-queue`로 옮겨지게 된다. 이를 통해 잘못된 메시지가 무한하게 반복되는 일을 막거나, 메시지를 정상적으로 소비하지 못하는 상태를 체크해서 알림을 줄 수도 있다. 

마지막으로는 SQS에는 `retention period` 설정이 존재한다. 이 설정은 큐에 들어온 메시지를 얼마나 오래 보유하고 있을지에 대한 값이다. 큐에 들어온 메시지는 소비되지 않으면 무한히 존재하는것이 아니라, 이 설정값에서 정한 시간이 지나면 삭제되게 된다.

SQS의 동작원리를 간단하게 살펴봤는데, 2번 현상에 대한 문제에 대한 원인은 파악할 수 없었다. 자 이제는 Localstack이 어떻게 동작하는지 찾아보자

### Localstack 구현 찾아보기

<div style="text-align:center"><img alt="Localstack" src="{{ site.baseurl }}/assets/img/post/localstack.png"></div>

[Localstack](https://github.com/localstack/localstack)은 오픈소스 프로젝트로 깃헙에 공개되어 있다. 그래서 어떻게 동작하는지 코드를 직접볼수 있기에 찾아보았다. Localstack의 SQS 구현을 찾아보면, 직접 처리하는 것이 아닌 프록시 형태로 다른 서비스를 이용해 제공하고 있다. 현재 제공하는 옵션으로는 [Moto](https://github.com/spulec/moto)와 [ElaticMQ](https://github.com/softwaremill/elasticmq) 중에 하나를 선택해서 SQS 구현체로 사용할 수 있다. 아무런 설정을 하지 않으면 Moto를 사용하게 설정되어있다. 당연히 따로 옵션을 주지 않았기에, Moto를 이용하고 있었고 이번엔 Moto를 찾아볼 차례다.

### Moto 구현 찾아보기

Moto는 AWS 서비스를 모킹해서 간단한 테스트를 해볼수 있도록 도와주는 프로젝트이다. 파이썬 AWS SDK로 Boto3가 존재하는데, 여기서 영감을 얻은건지 이름이 비슷하다. 회사에서 개발을 하다보면, 레거시가 쌓이면서 신규 입사자가 온보딩을 잘 할 수 있게 하려면 어떤 형태로 코드를 짜야할지 고민을 하게된다. 이 프로젝트는 디렉토리 구조가 AWS 서비스별로 잘 나누어져 있었고 파일 네이밍이 명확해서 어느 부분을 봐야하는지 찾기 어렵지 않았다. 잘 관리되는 프로젝트를 보면 영감을 얻게 되는것 같다.

코드에서 SQS 메시지를 읽어오는 부분을 살펴보면서 이상한 것은 없는지 검토했다. 코드를 쭉 보던 도중, `retention period` 관련해서 메시지의 보유기간을 관리하는 코드가 이상한 것을 발견했다. Moto의 구현은 메시지를 읽어올때마다, 메시지가 `retention period`가 지나지 않았는지 확인하는 로직이 있는데, 여기서 메시지의 생성시간이 아니라 큐의 생성시간을 보고있었다. 즉 `retention period` 보다 오래된 SQS에 대해서는 아무런 메시지를 수신할 수 없는 상태가 되는 것이다. `retention period`의 디폴트 값은 4일 이었으므로, 2번 현상에서의 적당히 오래된은 4일을 의미했다.

### Moto에 기여하기

이제 문제를 파악했으니, 수정을 해야한다. 위에서 찾은 이슈를 적당히 수정하고 PR을 날렸다. CI로 여러 테스트들이 달려 있었지만, 몇 줄 수정하고 단순한 테스트를 추가했기에 큰 문제가 없을 것이라고 생각했다. (사실은 파이썬에 익숙치 않아서, 파이썬에서 린트나 테스트를 돌려본 경험이 없어서 찾아보기가 귀찮았다) 하지만 린트에서 바로 실패하고 달려있는 테스트들을 통과하는데 실패했다.

<div style="text-align:center"><img alt="moto fail" src="{{ site.baseurl }}/assets/img/post/moto-test-fail.png"></div>

어떤 테스트들이 달려있는지 보면, 프로젝트의 일관된 코드 스타일을 유지하기 위한 린트 테스트가 존재한다. 그리고 코드 동작에 이상이 없는지 판단하기 위한 유닛 테스트, 작성된 코드가 잘 테스트 되고 있는지 검사하는 코드 커버리지 체크가 달려 있었다. 특이한 점은, 동일한 유닛 테스트를 여러 환경과 조건에서 돌려보는 테스트가 여럿 존재했다. 파이썬 버젼별로 `2.7` / `3.6` / `3.7` / `3.8` 그리고 moto를 서버형태로 제공했을 때와 아닌 경우를 나눠서 철저히 검증을 한다. 당연히 많은 테스트를 돌리기 때문에 상당히 오랜 시간이 소요되었다. 이걸 보면서, 사내에서 테스트가 오래걸린단 이유로 PR이 올라올때마다 테스트를 돌리지 않는것을 반성하게 되었다. 또한 잘 작성된 테스트와 높은 테스트 커버리지를 유지하는 것을 보면서, 라이브러리 이용자들이 불편을 겪지 않도록 하려는 오픈소스 메인테이너에게 존경심을 느끼게 된다.

로컬에서 린트와 테스트를 돌리고, 몇번의 시행착오 끝에 모든 테스트를 통과하고 기여할 수 있었다.

<div style="text-align:center"><img alt="moto success" src="{{ site.baseurl }}/assets/img/post/moto-test-success.png"></div>

비록 몇줄 수정하지 않았지만, 먼나라 일이라고만 생각했던 오픈소스에 처음으로 기여해보는 것은 흥미로운 일이었다. 위의 과정을 통해 만들어진 PR은 https://github.com/spulec/moto/pull/3924 여기서 확인해볼 수 있다. 이번 경험을 통해 오픈소스에 더 자주 기여하게 되거나 하진 않겠지만, 불편을 겪는 상황이 생긴다면 나 같은 사람이 또 생기지 않도록 기여할 의향은 있다. 한 번 해봤으니 다음은 좀 더 쉽지 않을까 생각한다.

### References

https://docs.aws.amazon.com/ko_kr/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-how-it-works.html

https://docs.aws.amazon.com/cli/latest/reference/sqs/

https://github.com/localstack/localstack

https://github.com/spulec/moto



