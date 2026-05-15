---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Python specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "ruff format \"$FILE_PATH\"",
        "description": "Auto-format Python files after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "ruff check --fix \"$FILE_PATH\"",
        "description": "Lint and auto-fix Python files after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "pyright \"$FILE_PATH\" 2>&1 | tail -5",
        "description": "Type-check after edit"
      }
    ]
  }
}
```

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)
