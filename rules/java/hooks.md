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

- **google-java-format**: 편집 후 `.java` 파일을 자동 포매팅합니다.
- **checkstyle**: Java 파일 편집 후 스타일 검사를 실행합니다.
- **./mvnw compile** 또는 **./gradlew compileJava**: 변경 후 컴파일 성공 여부를 확인합니다.
