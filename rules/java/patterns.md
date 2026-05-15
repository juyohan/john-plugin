---
paths:
  - "**/*.java"
---
# Java 패턴

> 이 파일은 [common/patterns.md](../common/patterns.md)을 Java 전용 내용으로 확장합니다.

## 리포지토리 패턴 (Repository Pattern)

데이터 액세스 로직을 인터페이스 뒤로 캡슐화합니다:

```java
public interface OrderRepository {
    Optional<Order> findById(Long id);
    List<Order> findAll();
    Order save(Order order);
    void deleteById(Long id);
}
```

구체적인 구현체는 저장소 상세 사항(JPA, JDBC, 테스트용 인메모리 등)을 처리합니다.

## 서비스 계층 (Service Layer)

비즈니스 로직은 서비스 클래스에 배치하고, 컨트롤러와 리포지토리는 얇게(thin) 유지합니다:

```java
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;

    public OrderService(OrderRepository orderRepository, PaymentGateway paymentGateway) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
    }

    public OrderSummary placeOrder(CreateOrderRequest request) {
        var order = Order.from(request);
        paymentGateway.charge(order.total());
        var saved = orderRepository.save(order);
        return OrderSummary.from(saved);
    }
}
```

## 생성자 주입 (Constructor Injection)

필드 주입 대신 항상 생성자 주입을 사용하십시오:

```java
// 양호 — 생성자 주입 (테스트 가능, 불변성 유지)
public class NotificationService {
    private final EmailSender emailSender;

    public NotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}

// 불량 — 필드 주입 (리플렉션 없이는 테스트가 어렵고, 프레임워크 의존적임)
public class NotificationService {
    @Inject // 또는 @Autowired
    private EmailSender emailSender;
}
```

## DTO 매핑 (DTO Mapping)

DTO에는 `record`를 사용합니다. 서비스/컨트롤러 경계에서 매핑을 수행합니다:

```java
public record OrderResponse(Long id, String customer, BigDecimal total) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getCustomerName(), order.getTotal());
    }
}
```

## 빌더 패턴 (Builder Pattern)

선택적 파라미터가 많은 객체에 사용합니다:

```java
public class SearchCriteria {
    private final String query;
    private final int page;
    private final int size;
    private final String sortBy;

    private SearchCriteria(Builder builder) {
        this.query = builder.query;
        this.page = builder.page;
        this.size = builder.size;
        this.sortBy = builder.sortBy;
    }

    public static class Builder {
        private String query = "";
        private int page = 0;
        private int size = 20;
        private String sortBy = "id";

        public Builder query(String query) { this.query = query; return this; }
        public Builder page(int page) { this.page = page; return this; }
        public Builder size(int size) { this.size = size; return this; }
        public Builder sortBy(String sortBy) { this.sortBy = sortBy; return this; }
        public SearchCriteria build() { return new SearchCriteria(this); }
    }
}
```

## 도메인 모델을 위한 봉인된 타입 (Sealed Types)

```java
public sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {
    record PaymentSuccess(String transactionId, BigDecimal amount) implements PaymentResult {}
    record PaymentFailure(String errorCode, String message) implements PaymentResult {}
}

// 철저한 처리 (Java 21+)
String message = switch (result) {
    case PaymentSuccess s -> "결제 완료: " + s.transactionId();
    case PaymentFailure f -> "결제 실패: " + f.errorCode();
};
```

## API 응답 엔벨로프 (API Response Envelope)

일관된 API 응답 형식을 유지합니다:

```java
public record ApiResponse<T>(boolean success, T data, String error) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
```

## 참고 자료

Spring Boot 아키텍처 패턴은 `springboot-patterns` 스킬을 참조하십시오.
REST, Panache 및 메시징을 사용한 Quarkus 아키텍처 패턴은 `quarkus-patterns` 스킬을 참조하십시오.
엔티티 설계 및 쿼리 최적화는 `jpa-patterns` 스킬을 참조하십시오.
