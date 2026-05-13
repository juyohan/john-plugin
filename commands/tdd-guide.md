---
description: Test-driven development — write failing tests first, then implement to pass (RED → GREEN → IMPROVE)
---

# `tdd-guide`

> Write failing tests first (RED), implement the minimum code to pass (GREEN), then refactor (IMPROVE). 80%+ coverage required.

$ARGUMENTS

---

Invoke the **`tdd-guide`** agent with the task description from `$ARGUMENTS`. The agent will:

1. **RED** — Write failing tests that specify the expected behavior
2. **GREEN** — Implement the minimum code to make tests pass
3. **IMPROVE** — Refactor while keeping tests green, verify 80%+ coverage

**Workflow position:** `/ce-plan` → `tdd-guide` → `/ce-work`

**Saves output to:** `docs/tests/YYYY/MM/DD-<title>.md`
