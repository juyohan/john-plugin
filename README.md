# Genie Plugin

**Genie**는 Claude Code를 위한 Compound Engineering 워크플로우 플러그인입니다.
아이디어 구체화부터 구현, 리뷰, 지식 자산화까지 — 일관된 단계별 루프로 개발을 진행합니다.

---

## 설치

```bash
# 1. 마켓플레이스 등록
/plugin marketplace add juyohan/john-plugin

# 2. 플러그인 설치
/plugin install john-plugin@john
```

> **설치 이름 참고**: 마켓플레이스 이름은 `john` (author), 설치 식별자는 `john-plugin` (레포 이름), 설치 후 플러그인 이름은 `genie`입니다.

### 규칙 적용 (필수)

Claude Code 플러그인은 코딩 규칙(Rules)을 자동으로 복사하지 못합니다. 다음 명령어로 규칙을 복사하세요.

```bash
mkdir -p ~/.claude/rules/john
cp -R ~/.claude/plugins/genie/rules/* ~/.claude/rules/john/
```

---

## 핵심 워크플로우

```
/genie:setup → /genie:brainstorm → /genie:plan → /genie:work → /genie:review → /genie:commit → /genie:learn
```

각 단계는 완료 후 자동으로 다음 단계를 실행하지 않습니다. 산출물을 확인한 뒤 직접 다음 커맨드를 실행하세요.

### 단계별 설명

| 커맨드 | 역할 | 산출물 |
|--------|------|--------|
| `/genie:setup` | 프로젝트 초기화 — 스택 자동 감지 후 CLAUDE.md + docs/ 생성 | `CLAUDE.md`, `docs/conventions.md`, `docs/architecture.md`, `docs/setup.md` |
| `/genie:brainstorm` | 요구사항 정의 — 한 번에 하나씩 질문하며 요구사항 문서 작성 | `docs/brainstorms/YYYY/MM/DD-<제목>.md` |
| `/genie:plan` | 구현 계획 — 결정사항, 유닛, 테스트 시나리오, 리스크 정의 | `docs/plans/YYYY/MM/DD-<제목>.md` |
| `/genie:test` | TDD 명세 — 실패하는 테스트 먼저 작성 (RED) | `docs/tests/YYYY/MM/DD-<제목>.md` |
| `/genie:work` | 구현 — 플랜 가드레일에 따라 기능을 완성하고 PR 생성 | 커밋 + PR |
| `/genie:review` | 코드 리뷰 — 다층 페르소나로 품질·보안·유지보수성 검토 | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| `/genie:commit` | 커밋 — 가치 중심의 커밋 메시지 생성 및 커밋 실행 | git commit |
| `/genie:learn` | 지식 자산화 — 이번 세션의 레슨런 기록 | `docs/compounds/YYYY/MM/DD-<제목>.md` |

### 선택 커맨드

| 커맨드 | 역할 |
|--------|------|
| `/genie:think` | 아이디어 탐색 — 무엇을 만들지 방향 정하기 |
| `/genie:strategy` | 전략 정렬 — STRATEGY.md 업데이트 |
| `/genie:fix` | 디버깅 — 근본 원인 찾고 버그 수정 |
| `/genie:optimize` | 성능 최적화 — 측정 기반 반복 개선 |

---

## 모델 라우팅

커맨드별로 적합한 Claude 모델이 자동으로 지정됩니다.

| 모델 | 커맨드 | 이유 |
|------|--------|------|
| **Opus** | `think`, `strategy`, `fix` | 복잡한 추론, 아키텍처 결정, 디버깅 |
| **Sonnet** | `setup`, `brainstorm`, `plan`, `work`, `review`, `test` | 일반 개발 작업 |
| **Haiku** | `commit`, `learn`, `optimize`, `help` | 경량 작업, 문서 생성 |

---

## 전문 에이전트

언어·도메인별 에이전트를 채팅에서 직접 호출할 수 있습니다.

| 에이전트 | 전문 분야 |
|----------|----------|
| `@genie:ts` | TypeScript / JavaScript |
| `@genie:java` | Java / Spring Boot |
| `@genie:kotlin` | Kotlin / Android |
| `@genie:py` | Python |
| `@genie:go` | Go |
| `@genie:swift` | Swift / iOS |
| `@genie:security` | 보안 감사 (OWASP Top 10) |
| `@genie:db` | JPA / SQL 최적화 |
| `@genie:e2e` | E2E 테스트 (Playwright) |
| `@genie:review` | 코드 리뷰 |
| `@genie:architect` | 시스템 설계 |

---

## 디렉토리 구조

```
.claude-plugin/   — 플러그인 메타데이터
commands/         — 커맨드 정의 (/genie:brainstorm, /genie:plan 등)
skills/           — 스킬 구현 로직
scripts/hooks/    — GateGuard, observe-runner 등 자동화 훅
rules/            — 코딩 규칙 (설치 후 ~/.claude/rules/에 복사)
docs/             — 워크플로우 산출물 (brainstorms, plans, reviews 등)
```
