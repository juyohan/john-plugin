---
description: Structured code review with layered reviewer personas — before merging PRs
---

# `ce-code-review`

> Review code changes with layered personas, confidence-based filtering, and merge/dedup pipeline.

$ARGUMENTS

---

Execute the **`ce-code-review`** skill. Read `skills/ce-code-review/SKILL.md` and follow the instructions exactly. Pass `$ARGUMENTS` as the target (leave empty to review current branch, or provide a PR link).

**Workflow position:** `/ce-work` → `/ce-code-review` → `/ce-commit`

**Severity tiers:** CRITICAL (blocks merge) → HIGH (fix before merge) → MEDIUM (consider) → LOW (optional)

**Saves output to:** `docs/reviews/YYYY/MM/DD-<title>.md`
