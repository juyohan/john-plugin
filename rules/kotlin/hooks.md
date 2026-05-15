---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
---
# Kotlin Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Kotlin-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "ktlint --format \"$FILE_PATH\"",
        "description": "Auto-format Kotlin files after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "detekt --input \"$FILE_PATH\" 2>&1 | tail -10",
        "description": "Run static analysis after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "./gradlew compileKotlin 2>&1 | tail -10",
        "description": "Verify compilation after changes"
      }
    ]
  }
}
```
