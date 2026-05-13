---
name: mysql
description: 프로덕션 백엔드를 위한 MySQL 및 MariaDB 스키마, 쿼리, 인덱싱, 트랜잭션, 복제 및 커넥션 풀 패턴.
origin: ECC
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# MySQL 패턴

MySQL 또는 MariaDB 스키마 설계, 마이그레이션(migration), 느린 쿼리 조사, 큐 방식 트랜잭션(queue-style transaction), 커넥션 풀(connection pool), 또는 프로덕션 데이터베이스 설정 작업 시 이 스킬을 사용합니다. MySQL과 MariaDB는 SQL 세부 사항에서 차이가 있으므로, 특정 기능 패턴을 적용하기 전에 버전을 먼저 확인하세요.

## 활성화 시점

- MySQL 또는 MariaDB 테이블, 인덱스, 제약조건 설계 시
- 대규모 프로덕션 테이블에 실행 전 마이그레이션 검토 시
- 느린 쿼리, 락 대기, 데드락(deadlock), 커넥션 고갈 디버깅 시
- 키셋 페이지네이션(keyset pagination), 업서트(upsert), 전문 검색(full-text search), JSON 컬럼, 큐 추가 시
- 애플리케이션 커넥션 풀, 읽기 복제본(read replica), TLS, 슬로우 로그 설정 시

## 버전 확인

먼저 엔진과 버전을 확인합니다:

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'version_comment';
```

MySQL과 MariaDB 가이드는 문법이 다를 때 분리해서 처리합니다:

- MySQL은 `ON DUPLICATE KEY UPDATE`에서 `VALUES(col)` 대신 행 별칭(row alias)을 권장하며, `VALUES(col)`는 사용 중단(deprecated)되었습니다.
- MariaDB는 `ON DUPLICATE KEY UPDATE`에서 삽입 값 참조 방식으로 `VALUES(col)`를 지원합니다. 크로스 엔진 호환성을 위해 이 방식을 사용하세요.
- `SKIP LOCKED`는 큐 방식 작업에만 적합합니다. 잠긴 행을 건너뛰며 일관성 없는 뷰를 반환할 수 있으므로, 일반 회계나 무결성에 민감한 읽기에는 사용하지 마세요.

## 스키마 기본값

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_orders_account_status_created (account_id, status, created_at),
    KEY idx_orders_active (account_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

기본 선택 기준:

| 사용 사례 | 권장 | 피해야 할 것 |
| --- | --- | --- |
| 대리 기본 키(surrogate primary key) | `BIGINT UNSIGNED AUTO_INCREMENT` | 20억 행 이상 증가 가능한 테이블에서 `INT` |
| UUID 조회 키 | 변환 헬퍼와 함께 `BINARY(16)` | 핫 테이블의 `VARCHAR(36)` 기본 키 |
| 금액 및 정확한 수량 | `DECIMAL(p, s)` | `FLOAT` 또는 `DOUBLE` |
| 사용자 대면 텍스트 | `utf8mb4` 테이블 및 인덱스 | MySQL `utf8` / `utf8mb3` 기본값 |
| 애플리케이션 타임스탬프 | 앱에서 UTC로 관리하는 `DATETIME` | `DATETIME`이 타임존 메타데이터를 저장한다고 가정 |
| 소프트 삭제(soft delete) | `deleted_at DATETIME NULL` + 스코프 인덱스 | 인덱스 없이 소프트 삭제 행 필터링 |
| 확장 가능한 상태 값 | 조회 테이블 또는 제약된 `VARCHAR` | 값이 자주 변하는 경우 `ENUM` |

## 인덱싱

복합 인덱스(composite index) 순서는 일반적으로 동등 조건을 먼저, 범위 또는 정렬 컬럼을 나중에 지정합니다:

```sql
CREATE INDEX idx_orders_account_status_created
    ON orders (account_id, status, created_at);

SELECT id, total
FROM orders
WHERE account_id = ?
  AND status = 'pending'
  AND created_at >= ?
ORDER BY created_at DESC
LIMIT 50;
```

인덱스를 추가하거나 변경하기 전에 `EXPLAIN`을 사용합니다:

```sql
EXPLAIN
SELECT id, total
FROM orders
WHERE account_id = 123 AND status = 'pending'
ORDER BY created_at DESC
LIMIT 50;
```

조사가 필요한 신호:

| 필드 | 위험 신호 |
| --- | --- |
| `type` | 대용량 테이블에서 `ALL` |
| `key` | 선택적 조건이 있는데 `NULL` |
| `rows` | 인터랙티브 경로에서 매우 높은 행 추정치 |
| `Extra` | `Using temporary`, `Using filesort`, 또는 광범위한 `Using where` |

인덱스를 무분별하게 추가하지 마세요. 인덱스마다 쓰기 비용, 마이그레이션 시간, 백업 크기, 버퍼 풀(buffer pool) 압력이 증가합니다.

## 쿼리 패턴

### 업서트(Upsert)

크로스 엔진 호환 형식:

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    updated_at = CURRENT_TIMESTAMP;
```

MySQL 행 별칭(row alias) 형식:

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?) AS new
ON DUPLICATE KEY UPDATE
    setting_value = new.setting_value,
    updated_at = CURRENT_TIMESTAMP;
```

행 별칭 형식은 대상이 MySQL임을 확인한 후에만 사용하세요. MariaDB 또는 MySQL/MariaDB 혼합 환경에는 `VALUES(col)`을 사용하세요.

### 키셋 페이지네이션(Keyset Pagination)

```sql
SELECT id, name, created_at
FROM products
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

커서에 맞는 인덱스를 생성합니다:

```sql
CREATE INDEX idx_products_created_id ON products (created_at, id);
```

대용량 테이블에서 깊은 `OFFSET` 페이지네이션을 사용하지 마세요. 서버가 페이지를 반환하기 전에 행을 스캔하고 버리게 됩니다.

### JSON 필드

JSON 컬럼은 관계형 필터링이나 제약조건이 많이 필요하지 않은 확장 데이터에 사용합니다.

```sql
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payload JSON NOT NULL,
    event_type VARCHAR(64)
        GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(payload, '$.type'))) STORED,
    KEY idx_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

자주 조회하는 JSON 경로는 생성 컬럼(generated column)으로 노출하고 해당 컬럼에 인덱스를 추가합니다. 외래 키, 소유권, 테넌시(tenancy), 라이프사이클 필드는 관계형으로 유지합니다.

### 전문 검색(Full-Text Search)

```sql
ALTER TABLE articles ADD FULLTEXT KEY ft_articles_title_body (title, body);

SELECT id, title, MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 20;
```

오타 허용, 복잡한 랭킹, 크로스 테이블 패싯, 또는 내장 전문 검색 기능을 넘어서는 언어별 분석이 필요할 때는 외부 검색 엔진을 사용하세요.

## 트랜잭션

트랜잭션을 짧게 유지하고 일관된 순서로 행을 잠급니다:

```sql
START TRANSACTION;

SELECT id, balance
FROM accounts
WHERE id IN (?, ?)
ORDER BY id
FOR UPDATE;

UPDATE accounts SET balance = balance - ? WHERE id = ?;
UPDATE accounts SET balance = balance + ? WHERE id = ?;

COMMIT;
```

데드락 및 락 대기 체크리스트:

- 모든 코드 경로에서 결정적 순서로 행을 잠급니다.
- 외부 API 호출은 트랜잭션 열기 전에 수행합니다.
- `UPDATE`, `DELETE`, 잠금 읽기에 사용되는 조건에 인덱스를 추가합니다.
- 데드락 발생 시 전체 트랜잭션을 롤백하고 제한된 재시도 횟수로 재시도합니다.
- 데드락 직후 `SHOW ENGINE INNODB STATUS\G`를 캡처합니다. 이후 이벤트로 덮어쓰일 수 있습니다.

큐 방식 워커 클레임(worker claim):

```sql
START TRANSACTION;

SELECT id
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE jobs
SET status = 'processing', started_at = CURRENT_TIMESTAMP
WHERE id = ?;

COMMIT;
```

`SKIP LOCKED`는 잠긴 행을 건너뛰는 것이 허용되는 큐 방식 워크로드에만 사용하세요. 일반적인 트랜잭션 일관성의 대체재가 아닙니다.

## 커넥션 풀

SQLAlchemy 예시:

```python
from sqlalchemy import create_engine

engine = create_engine(
    "mysql+mysqlconnector://app:secret@db.internal/app",
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=240,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)
```

Node.js `mysql2` 예시:

```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

const [rows] = await pool.execute(
  'SELECT id, total FROM orders WHERE account_id = ? LIMIT 50',
  [accountId],
);
```

애플리케이션 풀 재활용을 서버 `wait_timeout` 이하로 유지하세요. 서버가 `wait_timeout = 300`을 사용하는 경우, `pool_recycle`을 240초 정도로 설정하는 것이 적절합니다. `pool_pre_ping`은 네트워크 장애 및 페일오버 이벤트에서 복구하는 데 도움이 됩니다.

## 진단

유용한 1차 진단 명령어:

```sql
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G;
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

제어된 환경에서 슬로우 로그 활성화:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

`EXPLAIN ANALYZE`는 쿼리 실행이 안전한 경우에만 사용하세요. 실제로 실행되므로 프로덕션 규모 데이터에서는 비용이 클 수 있습니다.

## 복제(Replication)

읽기 복제본은 지연(lag)이 발생할 수 있습니다. 쓰기 직후 자신이 쓴 내용을 읽는 경로(read-your-own-write), 결제 흐름, 권한 확인, 멱등성 키(idempotency key) 읽기를 복제본으로 즉시 라우팅하지 마세요.

```sql
-- MySQL 레거시 용어, 기존 플릿에서 여전히 일반적
SHOW SLAVE STATUS\G;

-- 지원되는 경우 새로운 용어
SHOW REPLICA STATUS\G;
```

하나의 명령어로 표준화하기 전에 엔진/버전을 확인하세요. TCP 연결 생존 여부뿐만 아니라 복제본 SQL 스레드 상태, IO 스레드 상태, 지연을 모니터링하세요.

## 보안

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'use-a-secret-manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app'@'%';

ALTER USER 'app'@'%' REQUIRE SSL;

SELECT user, host
FROM mysql.user
WHERE user = '';

DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
```

보안 검토 항목:

- 애플리케이션 사용자에게 `ALL PRIVILEGES` 또는 `*.*`를 부여하지 마세요.
- 트래픽이 호스트 또는 네트워크를 가로지를 때 애플리케이션 사용자에게 TLS를 요구하세요.
- 자격증명은 플랫폼 시크릿 매니저에 저장하고, 예시, 스크립트, 저장소 파일에는 포함하지 마세요.
- 마이그레이션/관리 사용자와 런타임 애플리케이션 사용자를 분리하세요.
- 성능 튜닝 전에 퍼블릭 네트워크 노출과 바인드 주소를 감사하세요.

## 설정

전용 데이터베이스 호스트의 시작점 예시:

```ini
[mysqld]
innodb_buffer_pool_size = 4G
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

max_connections = 300
thread_cache_size = 50

wait_timeout = 300
interactive_timeout = 300
innodb_lock_wait_timeout = 10

slow_query_log = ON
long_query_time = 1
log_queries_not_using_indexes = ON

log_bin = mysql-bin
binlog_format = ROW
binlog_expire_logs_seconds = 604800
```

설정값은 범용 프리셋이 아닌 검토를 위한 출발점으로 다루세요. 워크로드, 하드웨어, 백업 정책, 복구 목표에 맞게 메모리, 커넥션, 로그 보존, 내구성 설정을 조정하세요.

## 안티 패턴

| 안티 패턴 | 위험 | 더 나은 패턴 |
| --- | --- | --- |
| 핫 경로에서 `SELECT *` | 과다 조회 및 취약한 클라이언트 | 명시적 컬럼 선택 |
| 깊은 `OFFSET` 페이지네이션 | 선형 스캔 및 느린 페이지 | 키셋 페이지네이션 |
| 외래 키 조인에 인덱스 없음 | 느린 조인 및 락 집중 삭제 | FK 컬럼에 의도적으로 인덱스 추가 |
| 긴 트랜잭션 | 락 대기 및 대용량 undo 기록 | 작은 단위로 커밋 |
| `mysql.user`에 직접 DML | 그랜트 테이블 손상 위험 | `CREATE USER`, `ALTER USER`, `DROP USER` 사용 |
| 관리자 권한의 애플리케이션 사용자 | 높은 피해 반경(blast radius) | 최소 권한(least-privilege) 런타임 사용자 |
| `wait_timeout` 초과 풀 재활용 | 오래된 풀링된 커넥션 | 타임아웃 이하로 재활용 및 pre-ping 설정 |
| 쓰기 후 복제본 읽기 | 오래된 사용자 대면 상태 | 쓰기 후 읽기 경로를 기본 서버(primary)에 고정 |

## 출력 기대값

이 스킬을 리뷰에 사용할 때 반환 내용:

1. 엔진/버전 가정 사항.
2. 가장 위험도 높은 정확성, 락, 보안, 마이그레이션 이슈.
3. 안전한 경로를 위한 정확한 SQL 또는 코드 변경사항.
4. 검증 계획: `EXPLAIN`, 마이그레이션 드라이런(dry run), 락/데드락 점검, 롤백 기준.
5. 권고 사항에 영향을 미치는 MySQL/MariaDB 문법 차이.

## 관련 항목

- 스킬: `postgres-patterns` — PostgreSQL 전용 스키마 및 쿼리 패턴
- 스킬: `database-migrations` — 마이그레이션 계획 및 롤아웃 안전성
- 스킬: `backend-patterns` — API 및 서비스 레이어 패턴
- 스킬: `security-review` — 시크릿 관리, 인증, 최소 권한
- 에이전트: `database-reviewer` — 광범위한 데이터베이스 리뷰 워크플로우
