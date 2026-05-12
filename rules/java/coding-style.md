---
paths:
  - "**/*.java"
---
# Java 코딩 스타일

> 이 파일은 [common/coding-style.md](../common/coding-style.md)을 Java 전용 내용으로 확장합니다.

## 포매팅 (Formatting)

- 규정 준수를 위해 **google-java-format** 또는 **Checkstyle** (Google 또는 Sun 스타일)을 사용합니다.
- 파일당 하나의 public 최상위 타입을 유지합니다.
- 일관된 들여쓰기: 2 또는 4개의 공백 (프로젝트 표준에 맞춤).
- 멤버 순서: 상수, 필드, 생성자, public 메서드, protected 메서드, private 메서드 순으로 배치합니다.

## 불변성 (Immutability)

- 값 타입(Value types)에는 `record`를 권장합니다 (Java 16+).
- 기본적으로 필드를 `final`로 선언하며, 필요한 경우에만 가변 상태를 사용합니다.
- public API에서 방어적 복사본을 반환합니다: `List.copyOf()`, `Map.copyOf()`, `Set.copyOf()`.
- Copy-on-write: 기존 인스턴스를 수정하는 대신 새로운 인스턴스를 반환합니다.

```java
// 양호 — 불변 값 타입
public record OrderSummary(Long id, String customerName, BigDecimal total) {}

// 양호 — final 필드, setter 없음
public class Order {
    private final Long id;
    private final List<LineItem> items;

    public List<LineItem> getItems() {
        return List.copyOf(items);
    }
}
```

## 명명 규칙 (Naming)

표준 Java 컨벤션을 따릅니다:
- 클래스, 인터페이스, 레코드, 열거형: `PascalCase`
- 메서드, 필드, 파라미터, 지역 변수: `camelCase`
- `static final` 상수: `SCREAMING_SNAKE_CASE`
- 패키지: 모두 소문자, 역도메인 형식 (`com.example.app.service`)

## 최신 Java 기능

가독성을 높이는 경우 최신 언어 기능을 활용합니다:
- **Records**: DTO 및 값 타입용 (Java 16+)
- **Sealed classes**: 폐쇄형 타입 계층 구조용 (Java 17+)
- **Pattern matching with instanceof**: 명시적 캐스팅 불필요 (Java 16+)
- **Text blocks**: SQL, JSON 템플릿 등 다중행 문자열용 (Java 15+)
- **Switch expressions**: 화살표 구문 사용 (Java 14+)
- **Pattern matching in switch**: 봉인된 타입의 철저한(exhaustive) 처리 (Java 21+)

```java
// Pattern matching instanceof
if (shape instanceof Circle c) {
    return Math.PI * c.radius() * c.radius();
}

// Sealed type hierarchy
public sealed interface PaymentMethod permits CreditCard, BankTransfer, Wallet {}

// Switch expression
String label = switch (status) {
    case ACTIVE -> "Active";
    case SUSPENDED -> "Suspended";
    case CLOSED -> "Closed";
};
```

## Optional 사용

- 결과가 없을 수 있는 조회 메서드에서는 `Optional<T>`를 반환합니다.
- `map()`, `flatMap()`, `orElseThrow()`를 사용하며, `isPresent()` 확인 없이 `get()`을 호출하지 마십시오.
- `Optional`을 필드 타입이나 메서드 파라미터로 사용하지 마십시오.

```java
// 양호
return repository.findById(id)
    .map(ResponseDto::from)
    .orElseThrow(() -> new OrderNotFoundException(id));

// 불량 — Optional을 파라미터로 사용
public void process(Optional<String> name) {}
```

## 에러 처리

- 도메인 에러에는 비검사 예외(Unchecked Exception)를 선호합니다.
- `RuntimeException`을 상속받는 도메인 전용 예외를 생성합니다.
- 최상위 핸들러가 아닌 이상 광범위한 `catch (Exception e)`를 지양합니다.
- 예외 메시지에 컨텍스트 정보를 포함합니다.

```java
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("Order not found: id=" + id);
    }
}
```

## 스트림 (Streams)

- 변환 작업에 스트림을 사용하되, 파이프라인은 짧게 유지합니다 (최대 3~4개 작업).
- 가독성이 좋은 경우 메서드 참조를 사용합니다: `.map(Order::getTotal)`.
- 스트림 연산에서 부작용(side effect)을 방지합니다.
- 복잡한 로직의 경우, 난해한 스트림 파이프라인보다 반복문(loop)을 선호합니다.

## 참고 자료

예제가 포함된 전체 코딩 표준은 `java-coding-standards` 스킬을 참조하십시오.
JPA/Hibernate 엔티티 디자인 패턴은 `jpa-patterns` 스킬을 참조하십시오.
