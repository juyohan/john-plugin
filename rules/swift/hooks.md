---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Swift specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "swiftformat \"$FILE_PATH\"",
        "description": "Auto-format Swift files after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "swiftlint lint --fix \"$FILE_PATH\" 2>&1 | tail -10",
        "description": "Run SwiftLint and auto-fix after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "swift build 2>&1 | tail -10",
        "description": "Type-check modified packages after edit"
      }
    ]
  }
}
```

## Warning

Flag `print()` statements — use `os.Logger` or structured logging instead for production code.
