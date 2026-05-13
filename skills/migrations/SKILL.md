---
name: migrations
description: PostgreSQL, MySQL, 주요 ORM(Prisma, Drizzle, Kysely, Django, TypeORM, golang-migrate)을 위한 스키마 변경, 데이터 마이그레이션, 롤백 및 무중단 배포 데이터베이스 마이그레이션 모범 사례.
origin: ECC
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# 데이터베이스 마이그레이션 패턴

프로덕션 시스템을 위한 안전하고 가역적인 데이터베이스 스키마 변경.

## 활성화 시점

- 데이터베이스 테이블 생성 또는 변경 시
- 컬럼 또는 인덱스 추가/삭제 시
- 데이터 마이그레이션 실행 시 (백필(backfill), 변환)
- 무중단(zero-downtime) 스키마 변경 계획 시
- 신규 프로젝트를 위한 마이그레이션 도구 설정 시

## 핵심 원칙

1. **모든 변경은 마이그레이션** — 프로덕션 데이터베이스를 직접 수정하지 마세요
2. **마이그레이션은 프로덕션에서 전진(forward-only)** — 롤백은 새로운 전진 마이그레이션으로 처리
3. **스키마 마이그레이션과 데이터 마이그레이션은 분리** — DDL과 DML을 하나의 마이그레이션에 혼합하지 마세요
4. **프로덕션 크기 데이터로 마이그레이션 테스트** — 100개 행에서 잘 동작하는 마이그레이션이 1,000만 행에서는 테이블을 잠글 수 있습니다
5. **배포된 마이그레이션은 불변(immutable)** — 프로덕션에서 실행된 마이그레이션은 절대 수정하지 마세요

## 마이그레이션 안전 체크리스트

마이그레이션 적용 전:

- [ ] UP과 DOWN이 모두 있거나 명시적으로 비가역(irreversible)으로 표시됨
- [ ] 대용량 테이블에서 전체 테이블 락 없음 (동시 작업 사용)
- [ ] 새 컬럼에 기본값이 있거나 NULL 허용 (기본값 없이 NOT NULL 추가 금지)
- [ ] 인덱스는 동시(CONCURRENTLY) 생성 (기존 테이블의 CREATE TABLE 인라인 방식 아님)
- [ ] 데이터 백필은 스키마 변경과 별도 마이그레이션
- [ ] 프로덕션 데이터 복사본으로 테스트 완료
- [ ] 롤백 계획 문서화

## PostgreSQL 패턴

### 컬럼 안전하게 추가하기

```sql
-- 좋음: NULL 허용 컬럼, 락 없음
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- 좋음: 기본값이 있는 컬럼 (Postgres 11+에서 즉시 처리, 재작성 없음)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 나쁨: 기존 테이블에 기본값 없이 NOT NULL (전체 재작성 필요)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- 이 쿼리는 테이블을 잠그고 모든 행을 재작성합니다
```

### 다운타임 없이 인덱스 추가하기

```sql
-- 나쁨: 대용량 테이블에서 쓰기 차단
CREATE INDEX idx_users_email ON users (email);

-- 좋음: 비차단(non-blocking), 동시 쓰기 허용
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- 참고: CONCURRENTLY는 트랜잭션 블록 내에서 실행 불가
-- 대부분의 마이그레이션 도구는 이를 위한 특별 처리가 필요합니다
```

### 컬럼 이름 변경 (무중단)

프로덕션에서 직접 이름을 변경하지 마세요. 확장-계약(expand-contract) 패턴을 사용하세요:

```sql
-- 1단계: 새 컬럼 추가 (migration 001)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 2단계: 데이터 백필 (migration 002, 데이터 마이그레이션)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- 3단계: 양쪽 컬럼을 읽고 쓰도록 애플리케이션 코드 업데이트
-- 애플리케이션 변경 사항 배포

-- 4단계: 기존 컬럼 쓰기 중단 후 삭제 (migration 003)
ALTER TABLE users DROP COLUMN username;
```

### 컬럼 안전하게 삭제하기

```sql
-- 1단계: 컬럼에 대한 모든 애플리케이션 참조 제거
-- 2단계: 컬럼 참조 없이 애플리케이션 배포
-- 3단계: 다음 마이그레이션에서 컬럼 삭제
ALTER TABLE orders DROP COLUMN legacy_status;

-- Django의 경우: SeparateDatabaseAndState를 사용하여 모델에서 제거하되
-- DROP COLUMN 생성을 막은 다음 (다음 마이그레이션에서 삭제)
```

### 대규모 데이터 마이그레이션

```sql
-- 나쁨: 하나의 트랜잭션으로 모든 행 업데이트 (테이블 잠금)
UPDATE users SET normalized_email = LOWER(email);

-- 좋음: 진행 상황과 함께 배치(batch) 업데이트
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Prisma (TypeScript/Node.js)

### 워크플로우

```bash
# 스키마 변경으로부터 마이그레이션 생성
npx prisma migrate dev --name add_user_avatar

# 프로덕션에서 대기 중인 마이그레이션 적용
npx prisma migrate deploy

# 데이터베이스 초기화 (개발 전용)
npx prisma migrate reset

# 스키마 변경 후 클라이언트 생성
npx prisma generate
```

### 스키마 예시

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  orders    Order[]

  @@map("users")
  @@index([email])
}
```

### 커스텀 SQL 마이그레이션

Prisma가 표현할 수 없는 작업 (동시 인덱스, 데이터 백필)의 경우:

```bash
# 빈 마이그레이션 생성 후 SQL 직접 편집
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma는 CONCURRENTLY를 생성할 수 없으므로 직접 작성
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle (TypeScript/Node.js)

### 워크플로우

```bash
# 스키마 변경으로부터 마이그레이션 생성
npx drizzle-kit generate

# 마이그레이션 적용
npx drizzle-kit migrate

# 스키마 직접 푸시 (개발 전용, 마이그레이션 파일 없음)
npx drizzle-kit push
```

### 스키마 예시

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Kysely (TypeScript/Node.js)

### 워크플로우 (kysely-ctl)

```bash
# 설정 파일 초기화 (kysely.config.ts)
kysely init

# 새 마이그레이션 파일 생성
kysely migrate make add_user_avatar

# 대기 중인 모든 마이그레이션 적용
kysely migrate latest

# 마지막 마이그레이션 롤백
kysely migrate down

# 마이그레이션 상태 확인
kysely migrate list
```

### 마이그레이션 파일

```typescript
// migrations/2024_01_15_001_create_user_profile.ts
import { type Kysely, sql } from 'kysely'

// 중요: 타입화된 DB 인터페이스가 아닌 Kysely<any>를 항상 사용하세요.
// 마이그레이션은 시간에 고정(frozen)되며 현재 스키마 타입에 의존해서는 안 됩니다.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_profile')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('avatar_url', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createIndex('idx_user_profile_avatar')
    .on('user_profile')
    .column('avatar_url')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_profile').execute()
}
```

### 프로그래밍 방식 마이그레이터(Migrator)

```typescript
import { Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
// ESM 전용 — CJS는 __dirname을 직접 사용 가능
import { fileURLToPath } from 'url'
const migrationFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  './migrations',
)

// `db`는 Kysely<any> 데이터베이스 인스턴스
const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
  // 경고: 개발 환경에서만 활성화하세요. 타임스탬프 순서 검증을 비활성화하여
  // 환경 간 스키마 드리프트(schema drift)를 유발할 수 있습니다.
  // allowUnorderedMigrations: true,
})

const { error, results } = await migrator.migrateToLatest()

results?.forEach((it) => {
  if (it.status === 'Success') {
    console.log(`migration "${it.migrationName}" executed successfully`)
  } else if (it.status === 'Error') {
    console.error(`failed to execute migration "${it.migrationName}"`)
  }
})

if (error) {
  console.error('migration failed', error)
  process.exit(1)
}
```

## Django (Python)

### 워크플로우

```bash
# 모델 변경으로부터 마이그레이션 생성
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate

# 마이그레이션 상태 확인
python manage.py showmigrations

# 커스텀 SQL을 위한 빈 마이그레이션 생성
python manage.py makemigrations --empty app_name -n description
```

### 데이터 마이그레이션

```python
from django.db import migrations

def backfill_display_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for user in batch:
            user.display_name = user.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

def reverse_backfill(apps, schema_editor):
    pass  # 데이터 마이그레이션, 역방향 불필요

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

데이터베이스에서 즉시 삭제하지 않고 Django 모델에서 컬럼을 제거하는 방법:

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # DB는 아직 건드리지 않음
        ),
    ]
```

## golang-migrate (Go)

### 워크플로우

```bash
# 마이그레이션 쌍 생성
migrate create -ext sql -dir migrations -seq add_user_avatar

# 대기 중인 모든 마이그레이션 적용
migrate -path migrations -database "$DATABASE_URL" up

# 마지막 마이그레이션 롤백
migrate -path migrations -database "$DATABASE_URL" down 1

# 버전 강제 지정 (dirty 상태 수정)
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### 마이그레이션 파일

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## 무중단 마이그레이션 전략

중요한 프로덕션 변경에는 확장-계약(expand-contract) 패턴을 따르세요:

```
Phase 1: EXPAND (확장)
  - 새 컬럼/테이블 추가 (NULL 허용 또는 기본값 있음)
  - 배포: 앱이 기존과 새 컬럼 모두에 쓰기
  - 기존 데이터 백필

Phase 2: MIGRATE (마이그레이션)
  - 배포: 앱이 새 컬럼에서 읽고, 양쪽 모두에 쓰기
  - 데이터 일관성 검증

Phase 3: CONTRACT (수축)
  - 배포: 앱이 새 컬럼만 사용
  - 별도 마이그레이션으로 기존 컬럼/테이블 삭제
```

### 타임라인 예시

```
Day 1: 마이그레이션으로 new_status 컬럼 추가 (NULL 허용)
Day 1: 앱 v2 배포 — status와 new_status 양쪽에 쓰기
Day 2: 기존 행을 위한 백필 마이그레이션 실행
Day 3: 앱 v3 배포 — new_status에서만 읽기
Day 7: 기존 status 컬럼 삭제 마이그레이션
```

## 안티 패턴

| 안티 패턴 | 실패 이유 | 더 나은 접근 |
|-------------|-------------|-----------------|
| 프로덕션에서 직접 SQL 실행 | 감사 추적 없음, 반복 불가 | 항상 마이그레이션 파일 사용 |
| 배포된 마이그레이션 편집 | 환경 간 드리프트 유발 | 새 마이그레이션 생성 |
| 기본값 없이 NOT NULL | 테이블 잠금, 모든 행 재작성 | NULL 허용 추가 후 백필, 그 다음 제약조건 추가 |
| 대용량 테이블에서 인라인 인덱스 | 빌드 중 쓰기 차단 | CREATE INDEX CONCURRENTLY |
| 하나의 마이그레이션에 스키마 + 데이터 | 롤백 어려움, 긴 트랜잭션 | 마이그레이션 분리 |
| 코드 제거 전 컬럼 삭제 | 누락된 컬럼으로 애플리케이션 오류 | 코드 먼저 제거 후 다음 배포에서 컬럼 삭제 |
