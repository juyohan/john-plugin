---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Testing

> This file extends [common/testing.md](../common/testing.md) with Swift specific content.

## Framework

Use **Swift Testing** (`import Testing`) for new tests. Use `@Test` and `#expect`:

```swift
@Test("User creation validates email")
func userCreationValidatesEmail() throws {
    #expect(throws: ValidationError.invalidEmail) {
        try User(email: "not-an-email")
    }
}
```

## Test Isolation

Each test gets a fresh instance — set up in `init`, tear down in `deinit`. No shared mutable state between tests.

## Parameterized Tests

```swift
@Test("Validates formats", arguments: ["json", "xml", "csv"])
func validatesFormat(format: String) throws {
    let parser = try Parser(format: format)
    #expect(parser.isValid)
}
```

## Coverage

```bash
swift test --enable-code-coverage
```

커버리지 리포트 확인 (80% 목표):

```bash
# 빌드 후 llvm-cov로 커버리지 수치 확인
xcrun llvm-cov report \
  .build/debug/<ProductName>.xctest/Contents/MacOS/<ProductName> \
  --instr-profile .build/debug/codecov/default.profdata \
  --ignore-filename-regex='.*Tests.*' | tail -5
```

CI에서 임계값 강제는 `swift-coverage-check` 스크립트 또는 Xcode Cloud 커버리지 게이트를 활용하십시오.

## Reference

See skill: `swift-protocol-di-testing` for protocol-based dependency injection and mock patterns with Swift Testing.
