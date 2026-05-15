---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---
# Java 훅 (Hooks)

> 이 파일은 [common/hooks.md](../common/hooks.md)을 Java 전용 내용으로 확장합니다.

## PostToolUse 훅

`~/.claude/settings.json`에서 설정하십시오:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "google-java-format -i \"$FILE_PATH\"",
        "description": "Auto-format Java files after edit"
      },
      {
        "matcher": "Write|Edit",
        "command": "ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo '.'); checkstyle -c \"$ROOT/checkstyle.xml\" \"$FILE_PATH\" 2>&1 | tail -10",
        "description": "Run style check after edit (checkstyle.xml resolved from git root)"
      },
      {
        "matcher": "Write|Edit",
        "command": "ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo '.'); if [ -f \"$ROOT/pom.xml\" ]; then cd \"$ROOT\" && { [ -f ./mvnw ] && ./mvnw compile -q || mvn compile -q; } 2>&1 | tail -10; elif [ -f \"$ROOT/gradlew\" ]; then cd \"$ROOT\" && ./gradlew compileJava 2>&1 | tail -10; fi",
        "description": "Verify compilation after changes (Maven/Gradle auto-detected from git root; mvnw preferred, falls back to global mvn)"
      }
    ]
  }
}
```
