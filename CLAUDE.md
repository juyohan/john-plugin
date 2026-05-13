# John Plugin — Claude Code Instructions

이 파일은 Claude Code가 자동으로 읽는 프로젝트 지시 파일입니다.
전체 워크플로우 가이드와 규칙은 **[AGENTS.md](./AGENTS.md)** 를 참조하십시오.

---

## 프로젝트 개요

CE(Compound Engineering) 워크플로우를 뼈대로 삼아 ECC(Everything Claude Code)의
스킬·룰·훅 인프라를 통합한 단일 Claude Code 플러그인.

## 핵심 워크플로우

```
/ce-brainstorm → /ce-plan → ecc:tdd-guide → /ce-work
```

모든 기능 개발은 이 순서를 따릅니다. `ce-plan` 완료 후 구현 전에 반드시 `ecc:tdd-guide`로 테스트를 먼저 작성합니다. 자세한 내용은 AGENTS.md 섹션 1 참조.

## 저장소 문서 관례

CE 워크플로우의 각 단계마다 산출물을 `docs/` 아래에 기록한다.
같은 작업이라면 `<제목>`을 단계 간 통일하여 추적 가능하게 한다.

`ce-ideate → ce-strategy → ce-brainstorm`은 같은 정의(Define) 페이즈 — brainstorms 폴더에 함께 보관.

| 단계 | 경로 |
|------|------|
| `ce-ideate` (선택) | `docs/brainstorms/YYYY/MM/DD-<제목>-ideation.md` |
| `ce-strategy` (선택) | `docs/brainstorms/YYYY/MM/DD-<제목>-strategy.md` |
| `ce-brainstorm` | `docs/brainstorms/YYYY/MM/DD-<제목>.md` ← 메인 |
| `ce-plan` | `docs/plans/YYYY/MM/DD-<제목>.md` |
| `tdd-guide` | `docs/tests/YYYY/MM/DD-<제목>.md` |
| `ce-work` / `ce-debug` / `ce-optimize` | `docs/work/YYYY/MM/DD-<제목>.md` |
| `ce-code-review` | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| `ce-compound` | `docs/compounds/YYYY/MM/DD-<제목>.md` |

## 플러그인 구조

```
.claude-plugin/   — 플러그인 메타데이터
commands/         — Claude Code 커맨드
skills/           — CE 스킬 (ce-brainstorm, ce-plan 등)
scripts/hooks/    — ECC 훅 자동화 (GateGuard, observe-runner 등)
docs/             — 프로젝트 문서 (brainstorms, plans 등)
```
