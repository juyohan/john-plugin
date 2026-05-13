---
date: 2026-05-13
origin: docs/brainstorms/2026/05/13-genie-rename.md
---

# Genie Rename — Implementation Plan

---

## Context

**Origin:** `docs/brainstorms/2026/05/13-genie-rename.md`
**목표:** `john-plugin` → `genie`, 모든 스킬/커맨드/에이전트 명칭을 짧고 일관되게 통일

---

## Decisions

| ID | 결정 | 근거 |
|----|------|------|
| D-1 | 플러그인 이름 `genie`로 변경 | `/genie:brainstorm` 형태의 네임스페이스 확보 |
| D-2 | SKILL.md 내부 내용은 변경 안 함 | 동작 변경 없음, 범위 최소화 |
| D-3 | hooks.json의 `john-plugin` 경로 탐색 코드는 `genie` 추가 (기존 유지) | 이미 설치된 환경 하위 호환 |
| D-4 | 커맨드 파일 내 STOP 주석의 다음 단계 표기는 새 이름으로 업데이트 | 사용자 혼란 방지 |

---

## Scope Boundaries

**포함**
- U1: `plugin.json` name 변경 + `AGENTS.md`, `CLAUDE.md` 커맨드 참조 업데이트
- U2: `commands/` 파일 전체 rename
- U3: `skills/` 디렉토리 전체 rename
- U4: `agents/` 파일 전체 rename
- U5: `hooks/hooks.json` + `scripts/hooks/observe-runner.js` 참조 업데이트

**포함 안 됨**
- skills/*/SKILL.md 내부 텍스트 내용 수정 (명칭 변경이 아닌 내용 변경)
- rules/ 디렉토리 (언어별 규칙, 이름 변경 무관)
- ~/.claude/agents/, ~/.claude/rules/ 심볼릭 링크 (install.sh 재실행으로 갱신)

---

## Implementation Units

### U1: Plugin metadata + 문서 참조 업데이트
**파일:**
- `.claude-plugin/plugin.json` — `"name": "john-plugin"` → `"name": "genie"`
- `CLAUDE.md` — 워크플로우 예시의 `/ce-*` → `/genie:*`, 플러그인명 업데이트
- `AGENTS.md` — 커맨드 참조 업데이트

**테스트 시나리오:**
- `plugin.json`의 `name` 필드가 `"genie"`인지 확인
- `CLAUDE.md`에서 `ce-` 접두어가 남아있지 않은지 확인

---

### U2: Commands 파일 rename

**매핑:**
```
ce-brainstorm.md  → brainstorm.md
ce-plan.md        → plan.md          (기존 plan.md는 삭제 또는 merge)
ce-work.md        → build.md
ce-debug.md       → fix.md
ce-optimize.md    → optimize.md
ce-code-review.md → review.md
ce-commit.md      → commit.md
ce-compound.md    → learn.md
ce-ideate.md      → think.md
ce-strategy.md    → strategy.md
tdd-guide.md      → test.md
ce-help.md        → help.md
plan.md           → 삭제 (ce-plan과 기능 중복)
```

**각 파일 내부:** description 프론트매터, STOP 주석의 다음 단계 표기 업데이트

**테스트 시나리오:**
- `commands/` 에 `ce-` 접두어 파일이 없는지 확인
- 각 파일의 `description:` 프론트매터가 존재하는지 확인
- `brainstorm.md` 내 STOP 주석이 `/genie:plan`을 가리키는지 확인

---

### U3: Skills 디렉토리 rename

**매핑:**
```
ce-brainstorm        → brainstorm
ce-plan              → plan
ce-work              → build
ce-debug             → fix
ce-optimize          → optimize
ce-code-review       → review
ce-commit            → commit
ce-compound          → learn
ce-ideate            → think
ce-strategy          → strategy
ce-commit-push-pr    → push-pr
ce-doc-review        → doc-review
ce-simplify-code     → simplify
ce-frontend-design   → design
ce-resolve-pr-feedback → resolve-pr
ce-worktree          → worktree
ce-clean-gone-branches → clean
ce-proof             → proof
backend-patterns     → backend
frontend-patterns    → frontend
nuxt4-patterns       → nuxt
vite-patterns        → vite
springboot-patterns  → springboot
jpa-patterns         → jpa
postgres-patterns    → postgres
mysql-patterns       → mysql
redis-patterns       → redis
coding-standards     → standards
tdd-workflow         → tdd
security-review      → security
ui-to-vue            → vue
database-migrations  → migrations
```

(springboot-security, springboot-tdd 유지)

**테스트 시나리오:**
- `skills/`에 `ce-` 접두어 디렉토리가 없는지 확인
- `skills/brainstorm/SKILL.md` 존재 확인
- `skills/nuxt/SKILL.md` 존재 확인

---

### U4: Agents 파일 rename

**매핑:**
```
typescript-reviewer.md        → ts.md
python-reviewer.md            → py.md
go-reviewer.md                → go.md
kotlin-reviewer.md            → kotlin.md
swift-reviewer.md             → swift.md
java-reviewer.md              → java.md
code-reviewer.md              → review.md
security-reviewer.md          → security.md
database-reviewer.md          → db.md
build-error-resolver.md       → fix.md
go-build-resolver.md          → fix-go.md
kotlin-build-resolver.md      → fix-kotlin.md
swift-build-resolver.md       → fix-swift.md
java-build-resolver.md        → fix-java.md
performance-optimizer.md      → perf.md
refactor-cleaner.md           → refactor.md
code-simplifier.md            → simplify.md
doc-updater.md                → docs.md
e2e-runner.md                 → e2e.md
tdd-guide.md                  → tdd.md
ce-adversarial-reviewer.md    → review-adversarial.md
ce-coherence-reviewer.md      → review-coherence.md
ce-correctness-reviewer.md    → review-correctness.md
ce-feasibility-reviewer.md    → review-feasibility.md
ce-maintainability-reviewer.md → review-maintainability.md
ce-scope-guardian-reviewer.md → review-scope.md
ce-testing-reviewer.md        → review-testing.md
architect.md                  → architect.md (유지)
planner.md                    → planner.md (유지)
```

**테스트 시나리오:**
- `agents/`에 `ce-` 접두어와 `-reviewer`, `-resolver` 접미어 파일이 없는지 확인
- `agents/ts.md`, `agents/fix.md`, `agents/tdd.md` 존재 확인

---

### U5: hooks.json + scripts 참조 업데이트

**파일:**
- `hooks/hooks.json` — bootstrap 경로 탐색 배열에 `"genie"`, `"genie@john"` 추가 (기존 `john-plugin` 유지로 하위 호환)
- `scripts/hooks/observe-runner.js` — `john-plugin` 참조 `genie` 추가

**테스트 시나리오:**
- `hooks/hooks.json`에 `"genie"` 문자열이 존재하는지 확인
- `observe-runner.js`에 `genie` 참조가 추가되었는지 확인

---

## Build Order

```
병렬 실행 가능
├── U1: plugin metadata
├── U2: commands rename
├── U3: skills rename
└── U4: agents rename

순차 필요
└── U5: cross-reference 업데이트 (U1 완료 후)
```

---

## Risks & Mitigations

| 위험 | 영향 | 완화 |
|------|------|------|
| `commands/plan.md` 와 `commands/ce-plan.md` 충돌 | plan.md 로 rename 시 기존 `plan.md` 덮어쓰기 | 기존 `plan.md` 내용을 `brainstorm.md`에 병합하거나 삭제 후 rename |
| 에이전트 이름 충돌 (`fix.md`, `security.md` 등) | 스킬과 에이전트 이름 동일 가능성 | 스킬은 skills/, 에이전트는 agents/ 분리되어 있으므로 실제 충돌 없음 |
| hooks.json bootstrap 경로 미탐지 | 설치된 환경에서 훅 미작동 | D-3 결정: 기존 `john-plugin` 항목 유지하고 `genie` 추가 |
| install.sh 재실행 필요 | ~/.claude 링크 갱신 안 됨 | 플랜 외 단계로 사용자에게 안내 |
