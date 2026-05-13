---
name: springboot-tdd
description: JUnit 5, Mockito, MockMvc, Testcontainers 및 JaCoCo를 사용한 Spring Boot 테스트 주도 개발(TDD). 기능을 추가하거나, 버그를 수정하거나, 리팩토링할 때 사용합니다.
origin: ECC
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.


# Spring Boot TDD 워크플로우

80% 이상의 커버리지(단위 + 통합 테스트)를 목표로 하는 Spring Boot 서비스용 TDD 가이드입니다.

## 활성화 시점

- 새로운 기능이나 엔드포인트를 개발할 때
- 버그 수정 또는 리팩토링 시
- 데이터 액세스 로직이나 보안 규칙을 추가할 때

## 워크플로우

1) 테스트를 먼저 작성합니다 (실패해야 함)
2) 테스트를 통과하기 위한 최소한의 코드를 구현합니다
3) 테스트가 통과된 상태에서 리팩토링을 진행합니다
4) 커버리지를 강제합니다 (JaCoCo)

## 단위 테스트 (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
  @Mock MarketRepository repo;
  @InjectMocks MarketService service;

  @Test
  void createsMarket() {
    CreateMarketRequest req = new CreateMarketRequest("이름", "설명", Instant.now(), List.of("카테고리"));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Market result = service.create(req);

    assertThat(result.name()).isEqualTo("이름");
    verify(repo).save(any());
  }
}
```

패턴:
- Arrange-Act-Assert (준비-실행-검증)
- 부분 모킹(partial mocks)은 피하고 명시적인 스터빙(stubbing)을 선호합니다
- 다양한 케이스에는 `@ParameterizedTest`를 사용합니다

## 웹 계층 테스트 (MockMvc)

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;

  @Test
  void returnsMarkets() throws Exception {
    when(marketService.list(any())).thenReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }
}
```

## 통합 테스트 (SpringBootTest)

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketIntegrationTest {
  @Autowired MockMvc mockMvc;

  @Test
  void createsMarket() throws Exception {
    mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"테스트","description":"설명","endDate":"2030-01-01T00:00:00Z","categories":["일반"]}
        """))
      .andExpect(status().isCreated());
  }
}
```

## 영속성 계층 테스트 (DataJpaTest)

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfig.class)
class MarketRepositoryTest {
  @Autowired MarketRepository repo;

  @Test
  void savesAndFinds() {
    MarketEntity entity = new MarketEntity();
    entity.setName("테스트");
    repo.save(entity);

    Optional<MarketEntity> found = repo.findByName("테스트");
    assertThat(found).isPresent();
  }
}
```

## Testcontainers

- 운영 환경과 유사한 환경을 위해 Postgres/Redis 등에 재사용 가능한 컨테이너를 사용합니다.
- `@DynamicPropertySource`를 통해 JDBC URL 등을 Spring 컨텍스트에 주입합니다.

## 커버리지 (JaCoCo)

Maven 설정 예시:
```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.14</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>
```

## 단언문 (Assertions)

- 가독성을 위해 AssertJ(`assertThat`)를 사용합니다.
- JSON 응답 검증에는 `jsonPath`를 사용합니다.
- 예외 검증: `assertThatThrownBy(...)`

## 테스트 데이터 빌더 (Test Data Builders)

```java
class MarketBuilder {
  private String name = "테스트";
  MarketBuilder withName(String name) { this.name = name; return this; }
  Market build() { return new Market(null, name, MarketStatus.ACTIVE); }
}
```

## CI 명령어

- Maven: `mvn -T 4 test` 또는 `mvn verify`
- Gradle: `./gradlew test jacocoTestReport`

**기억하세요**: 테스트는 빠르고, 독립적이며, 결정론적이어야 합니다. 구현 세부 사항이 아닌 동작(behavior)을 테스트하십시오.
