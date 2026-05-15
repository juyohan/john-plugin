---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Go specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "goimports -w \"$FILE_PATH\"",
        "description": "Auto-format and fix imports after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "go vet ./... 2>&1 | tail -10",
        "description": "Run go vet after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "staticcheck ./... 2>&1 | tail -10",
        "description": "Run extended static checks after edit"
      }
    ]
  }
}
```
