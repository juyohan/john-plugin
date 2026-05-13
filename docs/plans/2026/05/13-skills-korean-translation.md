# Skills 한국어 번역 플랜

**날짜:** 2026-05-13
**Origin:** `docs/brainstorms/2026/05/13-skills-korean-translation.md`

---

## 결정 사항

| 결정 | 내용 |
|------|------|
| 번역 패턴 기준 | `skills/jpa/SKILL.md` — prose 한국어, 코드 블록 영어, 기술 용어 첫 등장 시 `한국어(English)` 병기 |
| 파일 처리 방식 | 기존 파일 덮어쓰기 (새 파일 생성 아님) |
| ECC 동기화 | 신경 쓰지 않음, 번역 후 독립 관리 |
| references/ | 해당 12개 스킬에 없음 — 번역 대상 아님 |
| 실행 순서 | 도메인 묶음 4개, 단위 간 의존성 없음 |

---

## 번역 규칙

| 요소 | 처리 |
|------|------|
| frontmatter `description`, `argument-hint` | 한국어 번역 |
| 섹션 제목, 본문 prose | 한국어 번역 |
| 코드 블록 (` ``` `) | 영어 원문 유지 |
| `name`, `origin` 등 메타 필드 | 그대로 유지 |
| 기술 용어 첫 등장 | `한국어(English)` 병기 |
| 파일명, 경로, 명령어 | 영어 유지 |

---

## 구현 단위

### - U1. **DB 패턴 스킬 번역**

**파일:**
- `skills/mysql/SKILL.md` (~415 라인)
- `skills/postgres/SKILL.md` (~150 라인)
- `skills/redis/SKILL.md` (~406 라인)
- `skills/migrations/SKILL.md` (~432 라인)

**번역 포인트:**
- mysql: 버전 체크, 진단 섹션 제목 번역. 엔진별 구문 차이 설명 정확히 번역.
- postgres: Quick Reference 테이블 헤더 번역. SQL 블록 그대로.
- redis: 자료구조 치트시트 테이블 번역. Lua 코드 블록 그대로.
- migrations: 핵심 원칙 5개 항목 정확히 번역. 확장-계약 패턴(`expand-contract`) 설명 보존.

---

### - U2. **프론트엔드/빌드 스킬 번역**

**파일:**
- `skills/frontend/SKILL.md` (~650 라인)
- `skills/nuxt/SKILL.md` (~103 라인)
- `skills/vite/SKILL.md` (~452 라인)
- `skills/vue3/SKILL.md` (~137 라인)

**번역 포인트:**
- frontend: `Privacy and Data Boundaries` 섹션 정확히 번역. 민감 데이터 경고 보존.
- nuxt: 수화(hydration) 안전성 규칙 번역. `hydration mismatch` → `하이드레이션(hydration) 불일치`.
- vite: `VITE_` 접두사 보안 경고 정확히 번역. 안티패턴 설명 보존.
- vue3: CLI 명령어 블록 영어 유지. 트러블슈팅 테이블 번역.

---

### - U3. **백엔드 스킬 번역**

**파일:**
- `skills/backend/SKILL.md` (~599 라인)

**번역 포인트:**
- Repository Pattern, Service Layer, Middleware Pattern 제목 번역.
- Rate Limiting, Background Jobs, Logging 섹션 번역.
- 하단 요약 문장 번역.

---

### - U4. **개발 관례 스킬 번역**

**파일:**
- `skills/security/SKILL.md` (~497 라인)
- `skills/standards/SKILL.md` (~552 라인)
- `skills/tdd/SKILL.md` (~412 라인)

**번역 포인트:**
- security: 체크리스트 항목 번역. `FAIL/PASS` 태그 유지. Solana 섹션 번역.
- standards: Scope Boundaries 번역. `FAIL/PASS` 태그 유지.
- tdd: TDD 워크플로우 7단계 번역. 성공 지표(Success Metrics) 번역.

---

## 파일-단위 대응표

| U-ID | 파일 | 라인 수 |
|------|------|---------|
| U1 | skills/mysql/SKILL.md | ~415 |
| U1 | skills/postgres/SKILL.md | ~150 |
| U1 | skills/redis/SKILL.md | ~406 |
| U1 | skills/migrations/SKILL.md | ~432 |
| U2 | skills/frontend/SKILL.md | ~650 |
| U2 | skills/nuxt/SKILL.md | ~103 |
| U2 | skills/vite/SKILL.md | ~452 |
| U2 | skills/vue3/SKILL.md | ~137 |
| U3 | skills/backend/SKILL.md | ~599 |
| U4 | skills/security/SKILL.md | ~497 |
| U4 | skills/standards/SKILL.md | ~552 |
| U4 | skills/tdd/SKILL.md | ~412 |

---

## 테스트 시나리오

모든 U-ID 공통 (Covers AE-1):

| 시나리오 | 확인 방법 |
|---------|-----------|
| description 필드가 한국어 | frontmatter `description` 값에 한글 포함 |
| 코드 블록이 영어 유지 | ` ``` ` 내부 코드가 원문과 동일 |
| 기술 용어 첫 등장에 한/영 병기 | `한국어(English)` 형태 최소 1개 이상 존재 |
| 메타 필드 유지 | `name`, `origin` 등 frontmatter 키 그대로 |
| 섹션 수 유지 | `##` 개수가 원본과 동일 |

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| 기술 개념 오역 (hydration, expand-contract 등) | 기술 용어 원문 괄호 병기로 의미 보존 |
| 번역 중 코드 블록 수정 | 번역 후 코드 블록 원문과 대조 |
| 분량이 큰 파일 (frontend 650라인) 누락 | 섹션별 순차 번역, 섹션 수 확인 |

---

## 실행 순서

U1 → U2 → U3 → U4 순서 권장. 단위 간 의존성 없으므로 병렬 가능.
