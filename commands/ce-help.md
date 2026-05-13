---
description: Workflow guidance — which CE skill or command to use right now?
---

# `ce-help`

> Get routed to the right command for your current situation.

---

## Workflow Routing Guide

| 현재 상태 | 다음 단계 |
|-----------|-----------|
| 아이디어만 있음 | `/ce-ideate` 또는 `/ce-brainstorm` |
| 요구사항 문서 있음 | `/ce-plan` |
| 계획 문서 있음 | `tdd-guide` → `/ce-work` |
| 코드 작성 완료 | `/ce-code-review` |
| 리뷰 완료 | `/ce-commit` |
| 작업 완료, 정리 필요 | `/ce-compound` |
| 막혔을 때 | `/ce-debug` |
| 성능 이슈 | `/ce-optimize` |
| 제품 방향 확인/수정 | `/ce-strategy` |
| 프로젝트 맞춤 도구 확인 | `node scripts/detect-project.js` |

---

## Full Workflow

```
/ce-ideate        (선택) 아이디어 탐색
  ↓
/ce-strategy      (선택) 전략 정렬
  ↓
/ce-brainstorm    요구사항 정의  → docs/brainstorms/
  ↓
/ce-plan          구현 계획      → docs/plans/
  ↓
tdd-guide         테스트 먼저    → docs/tests/
  ↓
/ce-work          구현           → docs/work/
  ↓
/ce-code-review   코드 리뷰      → docs/reviews/
  ↓
/ce-commit        커밋
  ↓
/ce-compound      지식 자산화    → docs/compounds/
```

---

## Quick Fixes

- **빌드 실패** → `build-error-resolver` agent
- **보안 검토** → `security-reviewer` agent
- **TypeScript** → `typescript-reviewer` agent
- **Python** → `python-reviewer` agent
- **Go** → `go-reviewer` agent
- **Java** → `java-reviewer` agent
- **Kotlin** → `kotlin-reviewer` agent
- **Swift** → `swift-reviewer` agent

Run `node scripts/detect-project.js` to get language-specific recommendations for the current project.
