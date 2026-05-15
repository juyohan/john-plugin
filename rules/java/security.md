---
paths:
  - "**/*.java"
---
# Java 보안

> 이 파일은 [common/security.md](../common/security.md)을 Java 전용 내용으로 확장합니다.

## 비밀 정보 관리 (Secrets Management)

- 소스 코드에 API 키, 토큰 또는 자격 증명을 하드코딩하지 마십시오.
- 환경 변수를 사용하십시오: `System.getenv("API_KEY")`.
- 운영 환경의 비밀 정보는 비밀 관리 도구(Vault, AWS Secrets Manager 등)를 사용하십시오.
- 비밀 정보가 포함된 로컬 설정 파일은 `.gitignore`에 추가하십시오.

```java
// 불량
private static final String API_KEY = "sk-abc123...";

// 양호 — 환경 변수 사용
String apiKey = System.getenv("PAYMENT_API_KEY");
Objects.requireNonNull(apiKey, "PAYMENT_API_KEY 환경 변수가 설정되어야 합니다.");
```

## SQL 인젝션 방지 (SQL Injection Prevention)

- 항상 파라미터화된 쿼리(Parameterized Query)를 사용하고, 사용자 입력을 SQL 문자열에 직접 결합하지 마십시오.
- `PreparedStatement` 또는 프레임워크의 파라미터화된 쿼리 API를 사용하십시오.
- 네이티브 쿼리에 사용되는 모든 입력을 검증하고 정제(Sanitize)하십시오.

```java
// 불량 — 문자열 결합을 통한 SQL 인젝션 취약점
Statement stmt = conn.createStatement();
String sql = "SELECT * FROM orders WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// 양호 — PreparedStatement를 사용한 파라미터화된 쿼리
PreparedStatement ps = conn.prepareStatement("SELECT * FROM orders WHERE name = ?");
ps.setString(1, name);

// 양호 — JdbcTemplate 사용
jdbcTemplate.query("SELECT * FROM orders WHERE name = ?", mapper, name);
```

## 입력 검증 (Input Validation)

- 모든 사용자 입력은 처리 전 시스템 경계에서 검증하십시오.
- 검증 프레임워크 사용 시 DTO에 Bean Validation 어노테이션(`@NotNull`, `@NotBlank`, `@Size` 등)을 사용하십시오.
- 파일 경로 및 사용자가 제공한 문자열은 사용 전 정제하십시오.
- 검증에 실패한 입력은 명확한 에러 메시지와 함께 거부하십시오.

```java
// 순수 Java에서 수동 검증 예시
public Order createOrder(String customerName, BigDecimal amount) {
    if (customerName == null || customerName.isBlank()) {
        throw new IllegalArgumentException("고객 이름은 필수입니다.");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("금액은 양수여야 합니다.");
    }
    return new Order(customerName, amount);
}
```

## 인증 및 인가 (Authentication and Authorization)

- 독자적인 암호화 로직을 구현하지 말고, 검증된 라이브러리를 사용하십시오.
- 비밀번호는 MD5/SHA1이 아닌 bcrypt 또는 Argon2로 해싱하여 저장하십시오.
- 서비스 경계에서 인가 체크(Authorization check)를 강제하십시오.
- 로그에서 민감한 데이터를 제거하십시오 (비밀번호, 토큰, 개인정보 등 로그 금지).

## 의존성 보안 (Dependency Security)

- `mvn dependency:tree` 또는 `./gradlew dependencies` 명령어로 전이적 의존성을 감사하십시오.
- OWASP Dependency-Check 또는 Snyk을 사용하여 알려진 CVE를 스캔하십시오.
- Dependabot 또는 Renovate 등을 활용해 의존성을 최신 상태로 유지하십시오.

## 에러 메시지 (Error Messages)

- API 응답에 스택 트레이스, 내부 경로 또는 SQL 에러를 노출하지 마십시오.
- 핸들러 경계에서 예외를 안전하고 일반적인 클라이언트 메시지로 매핑하십시오.
- 상세 에러는 서버 측에 로그로 남기고, 클라이언트에는 일반적인 메시지를 반환하십시오.

```java
// 상세 내용은 로그에 남기고, 일반적인 메시지를 반환함
try {
    return orderService.findById(id);
} catch (OrderNotFoundException ex) {
    log.warn("주문을 찾을 수 없음: id={}", id);
    return ApiResponse.error("자원을 찾을 수 없습니다.");  // 내부 정보 노출 없는 일반 메시지
} catch (Exception ex) {
    log.error("주문 처리 중 예기치 않은 에러 발생: id={}", id, ex);
    return ApiResponse.error("내부 서버 에러가 발생했습니다.");  // ex.getMessage()를 절대 노출하지 않음
}
```

## 참고 자료

Spring Security 인증 및 인가 패턴은 `springboot-security` 스킬을 참조하십시오.
JWT/OIDC, RBAC 및 CDI를 사용한 Quarkus 보안은 `quarkus-security` 스킬을 참조하십시오.
일반 보안 체크리스트는 `security-review` 스킬을 참조하십시오.
