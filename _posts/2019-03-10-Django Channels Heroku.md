---
layout: post
title: Django Channels 2 Heroku에 배포하기
description: Django Channels 2 프로젝트를 Heroku에 배포하면서 겪은 이야기
feature-img: "assets/img/post/danbo-2011237_1920.jpg"
tags: [Python, Django, Channels, Heroku]
---

> Django Channels를 이용하여 처음으로 간단한 웹 프로젝트를 구성하였고, 이 과정에서 겪었던 이슈들을 기록합니다.

##### 시작전에

배포하기 전 `Channel layer`로 `InMemoryChannelLayer`를 사용하고 있었고, 이를 `RedisChannelLayer`로 변경하면서 생긴 이슈를 먼저 설명하고 넘어가겠습니다.

### Channel layer로 Redis 이용하기

기존에 추가적인 DB 이용 없이 간단하게 프로젝트를 구성하기 위해서 `InMemoryChannelLayer`를 사용하였다.  ***Heroku***에서 간단하게 *add-ons*을 이용하여 *redis*를 추가해줄 수 있었기에, 권장하지 않는 `InMemoryChannelLayer`를 버리고 `RedisChannelLayer`로 넘어가기로 결심했다.

```python
# settings.py

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}
```

기존의 해당 부분을 아래와 같이 간단히 바꿔주는 것으로 해결이 가능하다. 보통은.

```python
#settings.py

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379')],
        },
    }
}
```

*channel-layer*를 변경하고 `channel_group`에 2개 이상의 클라이언트를 연결하면, 특정 함수를 실행 시키는 과정에서 에러(`ValueError: No handler for message type 'new_type'`)가 발생했다. 에러를 발생시키는 아래와 유사했다.

```python
# consumer.py

"""
event = {
    'type': 'common_send',
	# others
}
"""

async def common_send(self, event):
    # event 변경
    event['type'] = 'new_type'
    await self.send_json(event)
```

여기서의 문제점은 *parameter*로 넘겨받은 `event`를 복제하거나 하지 않고 그대로 변경한 점이 문제가 되었다. `group_send($GROUP, $EVENT)`를 활용하여 *consumer*들에게 `event`를 전달하면, 같은 *group*에 포함된 각각의 *consumer*들은 `event['type']`을 확인하여 적절한 함수를 실행 시킨다.

`InMemoryChannelLayer` 같은 경우에는 각각 복사한 `event`를 넘겨 주어서 문제 없이 동작 된 것으로 추측된다. 하지만 `RedisChannelLayer`에서는 같은 `event` 객체를 통해 함수를 실행시켰기 때문에, 처음 `event`를 마주한 `consumer`는 올바르게 동작 했지만, 2번째 이상 부터는 `type`에 들어있는 `'new_type'`에 해당하는 함수를 찾을 수 없었기 때문에 문제가 발생했다. 

`event`를 복제해서 이용하는 것으로 위의 문제를 해결할 수 있었다.

### Heroku Django Tutorial 따라하기

기존에 ***Heroku***에 ***Django***를 배포하기 위해서는 몇 가지 설정들이 필요했지만, 글 작성기준으로 [Configuring Django Apps for Heroku](https://devcenter.heroku.com/articles/django-app-configuration)를 통해 정말 간단하게 해결 할 수 있었다.

```bash
pip install django-heroku
pip install gunicorn
pip install psycopg2 # for postgresql
```

```bash
# Procfile

web: gunicorn myproject.wsgi
```

```python
# settings.py

import django_heroku

# Activate Django-Heroku.
django_heroku.settings(locals())
```

이렇게 파일을 작성하고 *heroku app*에 *add-on*으로 *postgresql*을 하나 붙여주면 끝이다. `settings.py`에서 추가적인 DB 설정이 필요하지 않고, local에서 사용하는 DB 설정을 그대로 남겨놔도 문제 없이 알아서 잘 배포된다.

### ASGI

> [ASGI](http://asgi.readthedocs.io/), or the Asynchronous Server Gateway Interface 

위의 과정까지 따라하고 실행하면 ***WSGI***를 이용해서 *Django* 프로젝트를 실행시킨다. `Channels`는 ***WSGI***를 통해서는 실행시킬 수 없다. 위의 상태로 배포하면, 웹소켓에 연결하는 과정에서 `404` 에러를 마주하게 될 것이다. 그럼 ***ASGI***를 이용하여 배포하는 방법을 알아보자.

```python
# myproject/routing.py

ASGI_APPLICATION = "myproject.routing.application"

...
```

```python
# myproject/asgi.py

import os
import django
from channels.routing import get_default_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
django.setup()
application = get_default_application()
```

```bash
pip install daphne
```

```bash
# Procfile

daphne mafia.asgi:application --port $PORT --bind 0.0.0.0 -v2
```

위와 같이 파일들을 변경해주고, *Heroku*에 배포하면 드디어 정상 작동을 하는 모습을 확인 할 수 있을 것이다.





> 이와 같이 설정하면, 웹소켓과 관련되지 않은 부분도 모두 ***ASGI***를 이용하게 된다. 이는 좋지 않은 방식인데 이와 관련해서는 추가적으로 찾아보면 해결 방법을 찾을 수 있을 것이다. 이 글에서는 다루지 않을 것이다.



### References

https://channels.readthedocs.io/en/latest/deploying.html

https://devcenter.heroku.com/articles/django-app-configuration

https://channels.readthedocs.io/en/latest/asgi.html

http://asgi.readthedocs.io/