---
paths:
  - "**/*.java"
---
# Java 테스트

> 이 파일은 [common/testing.md](../common/testing.md)을 Java 전용 내용으로 확장합니다.

## 테스트 프레임워크

- **JUnit 5** (`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`)
- **AssertJ**: 유창한(fluent) 단언문 사용 (`assertThat(result).isEqualTo(expected)`)
- **Mockito**: 의존성 모킹(mocking)용
- **Testcontainers**: 데이터베이스나 서비스가 필요한 통합 테스트용

## 테스트 구조

```
src/test/java/com/example/app/
  service/           # 서비스 계층 단위 테스트
  controller/        # 웹 계층 / API 테스트
  repository/        # 데이터 액세스 테스트
  integration/       # 계층 간 통합 테스트
```

`src/test/java`의 패키지 구조를 `src/main/java`와 동일하게 유지하십시오.

## 단위 테스트 패턴

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository);
    }

    @Test
    @DisplayName("주문이 존재하면 findById는 주문을 반환한다")
    void findById_existingOrder_returnsOrder() {
        var order = new Order(1L, "Alice", BigDecimal.TEN);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        var result = orderService.findById(1L);

        assertThat(result.customerName()).isEqualTo("Alice");
        verify(orderRepository).findById(1L);
    }

    @Test
    @DisplayName("주문을 찾을 수 없으면 findById는 예외를 던진다")
    void findById_missingOrder_throws() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(99L))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining("99");
    }
}
```

## 매개변수화된 테스트 (Parameterized Tests)

```java
@ParameterizedTest
@CsvSource({
    "100.00, 10, 90.00",
    "50.00, 0, 50.00",
    "200.00, 25, 150.00"
})
@DisplayName("할인이 올바르게 적용된다")
void applyDiscount(BigDecimal price, int pct, BigDecimal expected) {
    assertThat(PricingUtils.discount(price, pct)).isEqualByComparingTo(expected);
}
```

## 통합 테스트 (Integration Tests)

실제 데이터베이스 연동을 위해 Testcontainers를 사용합니다:

```java
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    private OrderRepository repository;

    @BeforeEach
    void setUp() {
        var dataSource = new PGSimpleDataSource();
        dataSource.setUrl(postgres.getJdbcUrl());
        dataSource.setUser(postgres.getUsername());
        dataSource.setPassword(postgres.getPassword());
        repository = new JdbcOrderRepository(dataSource);
    }

    @Test
    void save_and_findById() {
        var saved = repository.save(new Order(null, "Bob", BigDecimal.ONE));
        var found = repository.findById(saved.getId());
        assertThat(found).isPresent();
    }
}
```

Spring Boot 통합 테스트는 `springboot-tdd` 스킬을 참조하십시오.
Quarkus 통합 테스트는 `quarkus-tdd` 스킬을 참조하십시오.

## 테스트 명명 규칙

`@DisplayName`과 함께 설명적인 이름을 사용하십시오:
- 메서드 이름: `methodName_scenario_expectedBehavior()`
- 리포트용: `@DisplayName("사람이 읽기 좋은 설명")`

## 커버리지 (Coverage)

- LINE, BRANCH, METHOD 커버리지 각 80% 이상을 목표로 합니다. (JaCoCo 기준)
- 커버리지 리포팅에는 JaCoCo를 사용합니다.
- 서비스 및 도메인 로직에 집중하고, 단순한 getter/설정 클래스는 제외해도 무방합니다.

## 참고 자료

MockMvc 및 Testcontainers를 사용한 Spring Boot TDD 패턴은 `springboot-tdd` 스킬을 참조하십시오.
REST Assured 및 Dev Services를 사용한 Quarkus TDD 패턴은 `quarkus-tdd` 스킬을 참조하십시오.
테스트 기대 사항은 `java-coding-standards` 스킬을 참조하십시오.
