# Genie Plugin

**Genie**는 Claude Code와 Codex를 위한 Compound Engineering 워크플로우 플러그인입니다.
아이디어 구체화부터 구현, 리뷰, 지식 자산화까지 — 일관된 단계별 루프로 개발을 진행합니다.

> 버전: **1.4.0** · Claude Code · Codex 지원

---

## 설치

### Claude Code

```bash
# 1. 마켓플레이스 등록
/plugin marketplace add juyohan/genie-plugin

# 2. 플러그인 설치
/plugin install genie-plugin@john
```

> 마켓플레이스 이름 `john` (author), 설치 식별자 `genie-plugin` (레포 이름), 설치 후 플러그인 이름 `genie`.

#### 규칙 적용 (필수)

플러그인은 코딩 규칙을 자동으로 복사하지 않습니다. 설치 후 수동으로 복사하세요.

```bash
mkdir -p ~/.claude/rules/john
cp -R ~/.claude/plugins/genie/rules/* ~/.claude/rules/john/
```

### Codex

**Step 1 — Codex에 마켓플레이스 등록:**
```bash
codex plugin marketplace add juyohan/genie-plugin
```

**Step 2 — Codex TUI를 통한 플러그인 설치:**
`codex`를 실행하고 `/plugins`를 입력하여 **genie-plugin**을 찾은 다음 **Install**을 선택하세요. 설치 완료 후 Codex를 재시작하세요.

---

## 핵심 워크플로우

```
/genie:setup → /genie:brainstorm → /genie:plan → /genie:test → /genie:work → /genie:review → /genie:commit → /genie:learn
```

각 단계는 완료 후 자동으로 다음 단계를 실행하지 않습니다. 산출물을 확인한 뒤 직접 다음 커맨드를 실행하세요.

### 단계별 설명

| 커맨드 | 역할 | 산출물 |
|--------|------|--------|
| `/genie:setup` | 프로젝트 초기화 — 스택 자동 감지 후 CLAUDE.md + docs/ 생성 | `CLAUDE.md`, `docs/conventions.md`, `docs/architecture.md` |
| `/genie:brainstorm` | 요구사항 정의 — 한 번에 하나씩 질문하며 요구사항 문서 작성 | `docs/brainstorms/YYYY/MM/DD-<제목>.md` |
| `/genie:plan` | 구현 계획 — 결정사항, 유닛, 테스트 시나리오, 리스크 정의 | `docs/plans/YYYY/MM/DD-<제목>.md` |
| `/genie:test` | TDD 명세 — 실패하는 테스트 먼저 작성 (RED) | `docs/tests/YYYY/MM/DD-<제목>.md` |
| `/genie:work` | 구현 — 플랜 가드레일에 따라 기능을 완성하고 PR 생성 | 커밋 + PR |
| `/genie:review` | 코드 리뷰 — 다층 페르소나로 품질·보안·유지보수성 검토 | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| `/genie:commit` | 커밋 — 가치 중심의 커밋 메시지 생성 및 커밋 실행 | git commit |
| `/genie:learn` | 지식 자산화 — 이번 세션의 레슨런 기록 | `docs/solutions/YYYY/MM/DD-<제목>.md` |

### 선택 커맨드

| 커맨드 | 역할 |
|--------|------|
| `/genie:think` | 아이디어 탐색 — 무엇을 만들지 방향 정하기 |
| `/genie:strategy` | 전략 정렬 — STRATEGY.md 업데이트 |
| `/genie:fix` | 디버깅 — 근본 원인 찾고 버그 수정 |
| `/genie:optimize` | 성능 최적화 — 측정 기반 반복 개선 |
| `/genie:help` | 커맨드 목록 및 사용법 안내 |

---

## 브랜치 보호

`main` · `master` · `develop` · `staging` 브랜치에서 작업을 요청하면 에이전트가 **자동으로 작업을 멈추고** 별도 브랜치 생성을 요구합니다. 예외 없이 매 요청마다 적용됩니다.

---

## 모델 라우팅 (Claude Code)

| 모델 | 커맨드 |
|------|--------|
| **Opus** | `think`, `strategy`, `fix` |
| **Sonnet** | `setup`, `brainstorm`, `plan`, `test`, `work`, `review` |
| **Haiku** | `commit`, `learn`, `optimize`, `help` |

---

## 전문 에이전트

언어·도메인별 에이전트를 채팅에서 직접 호출합니다.

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

## Codex 사용 가이드

### 설치 후 동작

설치가 완료되면 Codex는 `AGENTS.md`를 자동으로 읽어 브랜치 보호, 워크플로우 규칙을 적용합니다. `@genie:*` 에이전트도 `/agents`에서 확인할 수 있습니다.

### 스킬 호출

Claude Code의 `/genie:*` 커맨드는 Codex에서 직접 실행되지 않습니다. 플러그인 설치 후 스킬을 참조하여 에이전트에게 지시합니다.

```
"skills/commit/SKILL.md 를 읽고 커밋을 진행해줘"
"skills/review/SKILL.md 를 읽고 현재 변경사항을 리뷰해줘"
"skills/brainstorm/SKILL.md 를 읽고 요구사항 정의를 시작해줘"
```

### 플랫폼 차이

| 항목 | Claude Code | Codex |
|------|-------------|-------|
| 커맨드 진입 | `/genie:*` | 스킬 파일 직접 참조 |
| 지침 파일 | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` 직접 읽음 |
| 질문 도구 | `AskUserQuestion` | `request_user_input` |
| 컨텍스트 수집 | `!` 명령어 자동 실행 | 스킬 내 "컨텍스트 폴백" 섹션의 bash 명령 직접 실행 |
| 브랜치 보호 | 자동 적용 | `AGENTS.md` 섹션 4 규칙에 따라 적용 |

### 워크플로우 예시 (Codex)

```
1. skills/brainstorm/SKILL.md 를 읽고 요구사항 정의 시작
2. skills/plan/SKILL.md 를 읽고 구현 계획 작성
3. skills/tdd/SKILL.md 를 읽고 테스트 먼저 작성
4. skills/work/SKILL.md 를 읽고 구현 진행
5. skills/review/SKILL.md 를 읽고 코드 리뷰
6. skills/commit/SKILL.md 를 읽고 커밋
```

---

## 디렉토리 구조

```
AGENTS.md         — 에이전트 지침 (Claude Code + Codex 공용)
CLAUDE.md         — Claude Code 진입점 (@AGENTS.md 로드)
.claude-plugin/   — 플러그인 메타데이터 (name: genie, version: 1.3.1)
commands/         — Claude Code 커맨드 정의 (/genie:*)
agents/           — 전문 에이전트 정의 (@genie:ts, @genie:review 등)
skills/           — 스킬 구현 로직 (Claude Code + Codex 공용)
scripts/hooks/    — GateGuard 등 자동화 훅 (Claude Code 전용)
rules/            — 코딩 규칙 (설치 후 ~/.claude/rules/에 복사)
docs/             — 워크플로우 산출물 (brainstorms, plans, reviews 등)
```
