---
description: Test-driven development — write failing tests first (RED to GREEN to IMPROVE)
---

# `genie:test`

> Write failing tests first (RED), implement the minimum code to pass (GREEN), then refactor (IMPROVE). 80%+ coverage required.

$ARGUMENTS

---

Invoke the **`genie:test`** agent with the task description from `$ARGUMENTS`. The agent will:

1. **RED** — Write failing tests that specify the expected behavior
2. **GREEN** — Implement the minimum code to make tests pass
3. **IMPROVE** — Refactor while keeping tests green, verify 80%+ coverage

**Workflow position:** `/genie:plan` → `genie:test` → `/genie:build`

**Saves output to:** `docs/tests/YYYY/MM/DD-<title>.md`

---

> **이 단계가 완료되면 멈추십시오.**
> 산출물을 출력한 뒤 대기합니다. 다음 단계 (`/genie:build`)는 사용자가 직접 실행합니다.
