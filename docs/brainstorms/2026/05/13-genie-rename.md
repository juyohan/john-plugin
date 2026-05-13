---
date: 2026-05-13
type: brainstorm
---

# Plugin & Skill 명칭 통일 — Brainstorm

## 배경

기존 명칭 체계가 세 가지 패턴이 혼재:
- `ce-*` 접두어 (CE 워크플로우)
- `*-patterns` 접미어 (언어별 패턴 스킬)
- 접두어/접미어 없는 것 (`coding-standards`, `tdd-workflow` 등)

## 결정 사항

| 결정 | 내용 |
|------|------|
| 플러그인 이름 | `john-plugin` → `genie` |
| 워크플로우 커맨드 | `genie:` 접두어 + 짧은 동사형 |
| 패턴 스킬 | `-patterns` 접미어 제거 |
| 에이전트 | 짧은 단어 또는 `fix-*` / `review-*` 형태 |

## 명칭 매핑

### 커맨드

| 현재 | 변경 후 |
|------|---------|
| `ce-ideate` | `genie:think` |
| `ce-strategy` | `genie:strategy` |
| `ce-brainstorm` | `genie:brainstorm` |
| `ce-plan` | `genie:plan` |
| `tdd-guide` | `genie:test` |
| `ce-work` | `genie:build` |
| `ce-debug` | `genie:fix` |
| `ce-optimize` | `genie:optimize` |
| `ce-code-review` | `genie:review` |
| `ce-commit` | `genie:commit` |
| `ce-compound` | `genie:learn` |
| `ce-help` | `genie:help` |

### 스킬 디렉토리

| 현재 | 변경 후 |
|------|---------|
| `ce-brainstorm` | `brainstorm` |
| `ce-plan` | `plan` |
| `ce-work` | `build` |
| `ce-debug` | `fix` |
| `ce-optimize` | `optimize` |
| `ce-code-review` | `review` |
| `ce-commit` | `commit` |
| `ce-compound` | `learn` |
| `ce-ideate` | `think` |
| `ce-strategy` | `strategy` |
| `ce-commit-push-pr` | `push-pr` |
| `ce-doc-review` | `doc-review` |
| `ce-simplify-code` | `simplify` |
| `ce-frontend-design` | `design` |
| `ce-resolve-pr-feedback` | `resolve-pr` |
| `ce-worktree` | `worktree` |
| `ce-clean-gone-branches` | `clean` |
| `ce-proof` | `proof` |
| `backend-patterns` | `backend` |
| `frontend-patterns` | `frontend` |
| `nuxt4-patterns` | `nuxt` |
| `vite-patterns` | `vite` |
| `springboot-patterns` | `springboot` |
| `jpa-patterns` | `jpa` |
| `postgres-patterns` | `postgres` |
| `mysql-patterns` | `mysql` |
| `redis-patterns` | `redis` |
| `coding-standards` | `standards` |
| `tdd-workflow` | `tdd` |
| `security-review` | `security` |
| `ui-to-vue` | `vue` |
| `database-migrations` | `migrations` |
| `springboot-security` | `springboot-security` (유지) |
| `springboot-tdd` | `springboot-tdd` (유지) |

### 에이전트

| 현재 | 변경 후 |
|------|---------|
| `typescript-reviewer` | `ts` |
| `python-reviewer` | `py` |
| `go-reviewer` | `go` |
| `kotlin-reviewer` | `kotlin` |
| `swift-reviewer` | `swift` |
| `java-reviewer` | `java` |
| `code-reviewer` | `review` |
| `security-reviewer` | `security` |
| `database-reviewer` | `db` |
| `build-error-resolver` | `fix` |
| `go-build-resolver` | `fix-go` |
| `kotlin-build-resolver` | `fix-kotlin` |
| `swift-build-resolver` | `fix-swift` |
| `java-build-resolver` | `fix-java` |
| `performance-optimizer` | `perf` |
| `refactor-cleaner` | `refactor` |
| `code-simplifier` | `simplify` |
| `doc-updater` | `docs` |
| `e2e-runner` | `e2e` |
| `tdd-guide` | `tdd` |
| `ce-adversarial-reviewer` | `review-adversarial` |
| `ce-coherence-reviewer` | `review-coherence` |
| `ce-correctness-reviewer` | `review-correctness` |
| `ce-feasibility-reviewer` | `review-feasibility` |
| `ce-maintainability-reviewer` | `review-maintainability` |
| `ce-scope-guardian-reviewer` | `review-scope` |
| `ce-testing-reviewer` | `review-testing` |
| `architect` | `architect` (유지) |
| `planner` | `planner` (유지) |

## 영향 범위

- `.claude-plugin/plugin.json` — name 변경
- `commands/` — 파일명 전체 변경 + 내부 참조 업데이트
- `skills/` — 디렉토리명 전체 변경
- `agents/` — 파일명 전체 변경
- `AGENTS.md`, `CLAUDE.md` — 커맨드/에이전트 참조 업데이트
- `hooks/hooks.json` — 플러그인명 참조 업데이트
- `scripts/hooks/` — 내부 경로 참조 확인

## 범위 밖

- 스킬 SKILL.md 내부 내용 (동작 변경 없음)
- 에이전트 .md 내부 내용
- rules/ 디렉토리 (언어별 규칙, 이름 변경 불필요)
