---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 훅 (Hooks)

> 이 파일은 [common/hooks.md](../common/hooks.md)을 TypeScript/JavaScript 전용 내용으로 확장합니다.

## PostToolUse 훅

`~/.claude/settings.json`에서 설정하십시오:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm prettier --write \"$FILE_PATH\"",
        "description": "편집 후 JS/TS 파일 자동 포맷"
      },
      {
        "matcher": "Write|Edit",
        "command": "timeout 60 pnpm exec tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo",
        "description": "편집 후 타입 검사 (증분 빌드 + 60초 타임아웃)"
      }
    ]
  }
}
```

## Stop 훅

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "grep -rn 'console\\.log' --include='*.ts' --include='*.tsx' src/ && echo '[Hook] console.log found' || true",
        "description": "세션 종료 전 console.log 감사 (비차단: 알림만 제공, 세션을 중단하지 않음)"
      }
    ]
  }
}
```
