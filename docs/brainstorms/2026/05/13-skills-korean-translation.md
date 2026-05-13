# Skills 한국어 번역

**날짜:** 2026-05-13
**단계:** brainstorm → plan

---

## 개요

`skills/` 디렉토리 하위의 영어로 남아있는 SKILL.md 파일들을 한국어로 번역한다.
이미 번역된 스킬(brainstorm, fix, plan, jpa 등)의 패턴을 그대로 따른다.

---

## R-1 번역 대상

다음 12개 SKILL.md 파일을 한국어로 번역한다:

| 스킬 | 파일 경로 | origin |
|------|-----------|--------|
| backend | `skills/backend/SKILL.md` | ECC |
| frontend | `skills/frontend/SKILL.md` | ECC |
| mysql | `skills/mysql/SKILL.md` | ECC |
| nuxt | `skills/nuxt/SKILL.md` | ECC |
| postgres | `skills/postgres/SKILL.md` | ECC |
| redis | `skills/redis/SKILL.md` | ECC |
| migrations | `skills/migrations/SKILL.md` | ECC |
| security | `skills/security/SKILL.md` | ECC |
| standards | `skills/standards/SKILL.md` | ECC |
| tdd | `skills/tdd/SKILL.md` | ECC |
| vite | `skills/vite/SKILL.md` | ECC |
| vue3 | `skills/vue3/SKILL.md` | community |

---

## R-2 번역 규칙

이미 번역된 `skills/jpa/SKILL.md`, `skills/springboot/SKILL.md` 패턴을 기준으로 삼는다.

| 요소 | 처리 방식 |
|------|-----------|
| frontmatter `description` | 한국어로 번역 |
| 섹션 제목 (`##`, `###`) | 한국어로 번역 |
| 본문 prose | 한국어로 번역 |
| 코드 블록 (` ``` `) | 영어 원문 유지 |
| 기술 용어 (처음 등장 시) | `한국어(English)` 병기 (예: `감사(auditing)`) |
| 이후 반복 등장 기술 용어 | 한국어 단독 사용 가능 |
| 파일명, 경로, 명령어 | 영어 원문 유지 |

---

## R-3 번역 범위

- **포함**: frontmatter + body 전체
- **제외**: references/ 디렉토리 (해당 12개 스킬에 없음)
- **제외**: ECC 버전 추적 / 원본 표기
- **기존 파일 교체**: 새 파일 생성이 아닌 원본 파일 덮어쓰기

---

## A-1 담당자

- 번역 실행: Claude Code (`/genie:work`)
- 검토: 주요한

---

## F-1 핵심 흐름

1. 각 SKILL.md 파일 읽기
2. 번역 규칙(R-2)에 따라 한국어로 번역
3. 기존 파일 덮어쓰기
4. 12개 완료 후 커밋

---

## AE-1 인수 조건

- [ ] 12개 파일 모두 `description` 필드가 한국어
- [ ] 코드 블록은 영어 원문 그대로
- [ ] 기술 용어 처음 등장 시 `한국어(English)` 병기
- [ ] 기존 파일 구조(frontmatter 키, 섹션 구성) 유지
- [ ] `origin: ECC` 등 메타데이터 필드 유지

---

## 제외 범위

- 이미 한국어인 파일 (brainstorm, fix, plan, work, commit, jpa, springboot 등 23개)
- ECC 업스트림 동기화 프로세스
- 번역 버전 추적
