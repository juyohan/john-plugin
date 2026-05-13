---
name: redis
description: 프로덕션 애플리케이션을 위한 Redis 자료구조 패턴, 캐싱 전략, 분산 락, 속도 제한, Pub/Sub 및 커넥션 관리.
origin: ECC
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# Redis 패턴

일반적인 백엔드 사용 사례를 위한 Redis 모범 사례 빠른 참조.

## 동작 원리

Redis는 문자열(string), 해시(hash), 리스트(list), 셋(set), 정렬된 셋(sorted set), 스트림(stream) 등을 지원하는 인메모리(in-memory) 자료구조 저장소입니다. 개별 Redis 명령어는 단일 인스턴스에서 원자적(atomic)으로 실행됩니다. 다단계 워크플로우는 Lua 스크립트, MULTI/EXEC 트랜잭션, 또는 명시적 동기화를 통해 원자성을 유지해야 합니다. 데이터는 RDB 스냅샷이나 AOF 로그를 통해 선택적으로 영속화됩니다. 클라이언트는 RESP 프로토콜을 통해 TCP로 통신합니다. 요청마다 핸드셰이크 오버헤드를 피하기 위해 커넥션 풀이 필수입니다.

## 활성화 시점

- 애플리케이션에 캐싱 추가 시
- 속도 제한(rate limiting) 또는 스로틀링(throttling) 구현 시
- 분산 락(distributed lock) 또는 코디네이션 구축 시
- 세션 또는 토큰 저장소 설정 시
- 메시징을 위한 Pub/Sub 또는 Redis Streams 사용 시
- 프로덕션에서 Redis 설정 (풀링, 축출, 클러스터링) 시

## 자료구조 치트시트

| 사용 사례 | 자료구조 | 예시 키 |
|----------|-----------|-------------|
| 단순 캐시 | String | `product:123` |
| 사용자 세션 | Hash | `session:abc` |
| 리더보드(Leaderboard) | Sorted Set | `scores:weekly` |
| 고유 방문자 | Set | `visitors:2024-01-01` |
| 활동 피드 | List | `feed:user:456` |
| 이벤트 스트림 | Stream | `events:orders` |
| 카운터 / 속도 제한 | String (INCR) | `ratelimit:user:123` |
| 블룸 필터(Bloom filter) / HLL | HyperLogLog | `hll:pageviews` |

## 핵심 패턴

### 캐시 어사이드(Cache-Aside, 지연 로딩)

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_product(product_id: int):
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)

    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    r.setex(cache_key, 3600, json.dumps(product))  # TTL: 1시간
    return product
```

### 라이트 스루 캐시(Write-Through Cache)

```python
def update_product(product_id: int, data: dict):
    # DB에 먼저 쓰기
    db.execute("UPDATE products SET ... WHERE id = %s", product_id)

    # 캐시 즉시 업데이트
    cache_key = f"product:{product_id}"
    r.setex(cache_key, 3600, json.dumps(data))
```

### 캐시 무효화(Cache Invalidation)

```python
# 태그 기반 무효화 — 관련 키를 셋으로 묶기
def cache_product(product_id: int, category_id: int, data: dict):
    key = f"product:{product_id}"
    tag = f"tag:category:{category_id}"
    pipe = r.pipeline(transaction=True)
    pipe.setex(key, 3600, json.dumps(data))
    pipe.sadd(tag, key)
    pipe.expire(tag, 3600)
    pipe.execute()

def invalidate_category(category_id: int):
    tag = f"tag:category:{category_id}"
    keys = r.smembers(tag)
    if keys:
        r.delete(*keys)
    r.delete(tag)
```

### 세션 저장소(Session Storage)

```python
import time
import uuid

def create_session(user_id: int, ttl: int = 86400) -> str:
    session_id = str(uuid.uuid4())
    key = f"session:{session_id}"
    pipe = r.pipeline(transaction=True)
    pipe.hset(key, mapping={
        "user_id": user_id,
        "created_at": int(time.time()),
    })
    pipe.expire(key, ttl)
    pipe.execute()
    return session_id

def get_session(session_id: str) -> dict | None:
    data = r.hgetall(f"session:{session_id}")
    return data if data else None

def delete_session(session_id: str):
    r.delete(f"session:{session_id}")
```

## 속도 제한(Rate Limiting)

### 고정 윈도우(Fixed Window, 단순)

```python
def is_rate_limited(user_id: int, limit: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:{user_id}:{int(time.time()) // window}"
    pipe = r.pipeline(transaction=True)
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()
    return count > limit
```

### 슬라이딩 윈도우(Sliding Window, Lua — 원자적)

```lua
-- sliding_window.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    -- 같은 밀리초 내 충돌 방지를 위해 고유 멤버 (now + sequence) 사용
    local seq_key = key .. ':seq'
    local seq = redis.call('INCR', seq_key)
    redis.call('EXPIRE', seq_key, math.ceil(window / 1000))
    redis.call('ZADD', key, now, now .. '-' .. seq)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return 1
end
return 0
```

```python
sliding_window = r.register_script(open('sliding_window.lua').read())

def allow_request(user_id: int) -> bool:
    key = f"ratelimit:sliding:{user_id}"
    now = int(time.time() * 1000)
    return bool(sliding_window(keys=[key], args=[now, 60000, 100]))
```

## 분산 락(Distributed Locks)

### 분산 락 (단일 노드 — SET NX PX)

```python
import uuid

def acquire_lock(resource: str, ttl_ms: int = 5000) -> str | None:
    lock_key = f"lock:{resource}"
    token = str(uuid.uuid4())
    acquired = r.set(lock_key, token, px=ttl_ms, nx=True)
    return token if acquired else None

def release_lock(resource: str, token: str) -> bool:
    release_script = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """
    result = r.eval(release_script, 1, f"lock:{resource}", token)
    return bool(result)

# 사용 예
token = acquire_lock("order:payment:123")
if token:
    try:
        process_payment()
    finally:
        release_lock("order:payment:123", token)
```

> 다중 노드 환경에서는 전체 Redlock 알고리즘을 구현하는 `redlock-py` 라이브러리를 사용하세요.

## Pub/Sub 및 스트림(Streams)

### Pub/Sub (파이어 앤 포겟, Fire-and-Forget)

```python
# 발행자(Publisher)
def publish_event(channel: str, payload: dict):
    r.publish(channel, json.dumps(payload))

# 구독자(Subscriber) (블로킹 — 별도 스레드/프로세스에서 실행)
def subscribe_events(channel: str):
    pubsub = r.pubsub()
    pubsub.subscribe(channel)
    for message in pubsub.listen():
        if message['type'] == 'message':
            handle(json.loads(message['data']))
```

### Redis Streams (내구성 있는 큐, Durable Queue)

```python
# 생산자(Producer)
def emit(stream: str, event: dict):
    r.xadd(stream, event, maxlen=10000)  # 스트림 길이 제한

# 컨슈머 그룹(Consumer group) — 최소 한 번 전달 보장
try:
    r.xgroup_create('events:orders', 'processor', id='0', mkstream=True)
except Exception:
    pass  # 그룹이 이미 존재함

def consume(stream: str, group: str, consumer: str):
    while True:
        messages = r.xreadgroup(group, consumer, {stream: '>'}, count=10, block=2000)
        for _, entries in (messages or []):
            for msg_id, data in entries:
                process(data)
                r.xack(stream, group, msg_id)
```

> 전달 보장, 컨슈머 그룹, 또는 재생(replay)이 필요할 때는 Pub/Sub 대신 **Streams**를 사용하세요.

## 키 설계

### 네이밍 컨벤션(Naming Conventions)

```
# 패턴: resource:id:field
user:123:profile
order:456:status
cache:product:789

# 패턴: namespace:resource:id
myapp:session:abc123
myapp:ratelimit:user:123

# 패턴: resource:date (시간 제한 키)
stats:pageviews:2024-01-01
```

### TTL 전략

| 데이터 유형 | 권장 TTL |
|-----------|--------------|
| 사용자 세션 | 24시간 (`86400`) |
| API 응답 캐시 | 5–15분 |
| 속도 제한 윈도우 | 윈도우 크기에 맞춤 |
| 단기 토큰 | 5–10분 |
| 리더보드 | 1시간–24시간 |
| 정적/참조 데이터 | 1시간–1주일 |

항상 TTL을 설정하세요. TTL 없는 키는 무한히 누적되어 메모리 압박을 유발합니다.

## 커넥션 관리

### 커넥션 풀링(Connection Pooling)

```python
from redis import ConnectionPool, Redis

pool = ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=20,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)

r = Redis(connection_pool=pool)
```

### 클러스터 모드(Cluster Mode)

```python
from redis.cluster import RedisCluster

r = RedisCluster(
    startup_nodes=[{"host": "redis-1", "port": 6379}],
    decode_responses=True,
    skip_full_coverage_check=True,
)
```

### 센티넬(Sentinel, 고가용성)

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel-1', 26379), ('sentinel-2', 26379)],
    socket_timeout=0.5,
)
master = sentinel.master_for('mymaster', decode_responses=True)
replica = sentinel.slave_for('mymaster', decode_responses=True)
```

## 축출 정책(Eviction Policies)

| 정책 | 동작 | 적합한 경우 |
|--------|----------|----------|
| `noeviction` | 가득 찰 때 쓰기 오류 | 큐 / 중요 데이터 |
| `allkeys-lru` | 가장 최근에 사용되지 않은 키 축출 | 일반 캐시 |
| `volatile-lru` | TTL이 있는 키 중 LRU만 축출 | 혼합 데이터 저장소 |
| `allkeys-lfu` | 가장 적게 사용된 키 축출 | 편향된 접근 패턴 |
| `volatile-ttl` | 가장 빨리 만료될 키 축출 | 오래 지속되는 데이터 우선시 |

`redis.conf`에서 설정: `maxmemory-policy allkeys-lru`

## 안티 패턴

| 안티 패턴 | 문제 | 해결책 |
|---|---|---|
| TTL 없는 키 | 메모리가 무한히 증가 | 항상 TTL 설정 |
| 프로덕션에서 `KEYS *` | 서버 블로킹 (O(N)) | `SCAN` 커서 사용 |
| 대용량 블롭(blob) 저장 (>100KB) | 느린 직렬화, 메모리 압박 | 참조만 저장 + 객체 저장소에서 가져오기 |
| 모든 용도에 단일 Redis | 캐시와 큐 간 격리 없음 | 별도 DB 또는 인스턴스 사용 |
| 커넥션 풀 한도 무시 | 부하 시 커넥션 고갈 | 워크로드에 맞게 풀 크기 설정 |
| 캐시 미스 스탬피드(stampede) 미처리 | 콜드 스타트 시 썬더링 허드(thundering herd) | 락 또는 확률적 조기 만료 사용 |
| 무분별한 `FLUSHALL` | 전체 인스턴스 삭제 | 키 패턴으로 범위 지정하여 삭제 |

### 캐시 미스 스탬피드(Cache Miss Stampede) 방지

```python
import threading

_locks: dict[str, threading.Lock] = {}
_locks_mutex = threading.Lock()

def get_with_lock(key: str, fetch_fn, ttl: int = 300):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    with _locks_mutex:
        if key not in _locks:
            _locks[key] = threading.Lock()
        lock = _locks[key]
    with lock:
        cached = r.get(key)  # 락 획득 후 재확인
        if cached:
            return json.loads(cached)
        value = fetch_fn()
        r.setex(key, ttl, json.dumps(value))
        return value
```

> 멀티 프로세스 배포 환경에서는 인프로세스 락 대신 위의 분산 락 섹션에 있는 `acquire_lock`/`release_lock`을 사용하세요.

## 사용 예시

**Django/Flask API 엔드포인트에 캐싱 추가:**
응답에 `setex`와 5분 TTL로 캐시 어사이드를 사용하세요. 요청 파라미터로 키를 구성합니다.

**사용자별 API 속도 제한:**
저트래픽 엔드포인트에는 `pipeline(transaction=True)`와 함께 고정 윈도우를 사용하고, 정확한 사용자별 스로틀링에는 슬라이딩 윈도우 Lua를 사용하세요.

**워커 간 백그라운드 작업 조율:**
예상 작업 시간을 초과하는 TTL로 `acquire_lock`을 사용하세요. `finally` 블록에서 항상 해제합니다.

**여러 구독자에게 알림 팬아웃(fan-out):**
파이어 앤 포겟에는 Pub/Sub를 사용하세요. 지연된 컨슈머에 대한 보장된 전달 또는 재생이 필요하면 Streams로 전환하세요.

## 빠른 참조

| 패턴 | 사용 시점 |
|---------|-------------|
| 캐시 어사이드 | 읽기 집중, 약간의 지연(staleness) 허용 |
| 라이트 스루 | 강한 일관성 요구 |
| 분산 락 | 리소스에 대한 동시 접근 방지 |
| 슬라이딩 윈도우 속도 제한 | 정확한 사용자별 스로틀링 |
| Redis Streams | 컨슈머 그룹과 함께 내구성 있는 이벤트 큐 |
| Pub/Sub | 전달 보장 없이 브로드캐스트 |
| 정렬된 셋 리더보드 | 순위 점수, 페이지네이션 |
| HyperLogLog | 낮은 메모리로 근사 고유 카운트 |

## 관련 항목

- 스킬: `postgres-patterns` — 관계형 데이터 패턴
- 스킬: `backend-patterns` — API 및 서비스 레이어 패턴
- 스킬: `database-migrations` — 스키마 버전 관리
- 스킬: `django-patterns` — Django 캐시 프레임워크 통합
- 에이전트: `database-reviewer` — 전체 데이터베이스 리뷰 워크플로우
