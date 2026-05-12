---
name: jpa-patterns
description: Spring Boot에서 엔티티 설계, 연관 관계, 쿼리 최적화, 트랜잭션, 감사(auditing), 인덱싱, 페이지네이션 및 커넥션 풀링을 위한 JPA/Hibernate 패턴.
origin: ECC
---

# JPA/Hibernate 패턴

Spring Boot에서 데이터 모델링, 리포지토리 구성 및 성능 튜닝을 위해 사용합니다.

## 활성화 시점

- JPA 엔티티 및 테이블 매핑을 설계할 때
- 연관 관계(@OneToMany, @ManyToOne, @ManyToMany)를 정의할 때
- 쿼리 최적화(N+1 방지, 페치 전략, 프로젝션)가 필요할 때
- 트랜잭션, 감사(auditing) 또는 소프트 삭제(soft delete)를 설정할 때
- 페이지네이션, 정렬 또는 사용자 정의 리포지토리 메서드를 구축할 때
- 커넥션 풀링(HikariCP) 또는 2차 캐시를 튜닝할 때

## 엔티티 설계 (Entity Design)

```java
@Entity
@Table(name = "markets", indexes = {
  @Index(name = "idx_markets_slug", columnList = "slug", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
public class MarketEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, unique = true, length = 120)
  private String slug;

  @Enumerated(EnumType.STRING)
  private MarketStatus status = MarketStatus.ACTIVE;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;
}
```

감사(Auditing) 활성화:
```java
@Configuration
@EnableJpaAuditing
class JpaConfig {}
```

## 연관 관계 및 N+1 방지

```java
@OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
private List<PositionEntity> positions = new ArrayList<>();
```

- 기본적으로 지연 로딩(Lazy Loading)을 사용하며, 필요할 때 쿼리에서 `JOIN FETCH`를 사용합니다.
- 컬렉션에 `EAGER` 사용을 피하고, 읽기 작업에는 DTO 프로젝션을 활용합니다.

```java
@Query("select m from MarketEntity m left join fetch m.positions where m.id = :id")
Optional<MarketEntity> findWithPositions(@Param("id") Long id);
```

## 리포지토리 패턴

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  Optional<MarketEntity> findBySlug(String slug);

  @Query("select m from MarketEntity m where m.status = :status")
  Page<MarketEntity> findByStatus(@Param("status") MarketStatus status, Pageable pageable);
}
```

- 가벼운 쿼리를 위해 프로젝션을 사용합니다:
```java
public interface MarketSummary {
  Long getId();
  String getName();
  MarketStatus getStatus();
}
Page<MarketSummary> findAllBy(Pageable pageable);
```

## 트랜잭션 (Transactions)

- 서비스 메서드에 `@Transactional` 어노테이션을 추가합니다.
- 읽기 전용 작업에는 최적화를 위해 `@Transactional(readOnly = true)`를 사용합니다.
- 전파(propagation) 레벨을 신중히 선택하고, 장시간 실행되는 트랜잭션을 피합니다.

```java
@Transactional
public Market updateStatus(Long id, MarketStatus status) {
  MarketEntity entity = repo.findById(id)
      .orElseThrow(() -> new EntityNotFoundException("Market"));
  entity.setStatus(status);
  return Market.from(entity);
}
```

## 페이지네이션 (Pagination)

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<MarketEntity> markets = repo.findByStatus(MarketStatus.ACTIVE, page);
```

커서 기반 페이지네이션의 경우, 정렬과 함께 JPQL에 `id > :lastId` 조건을 포함합니다.

## 인덱싱 및 성능

- 자주 필터링되는 컬럼(`status`, `slug`, 외래 키 등)에 인덱스를 추가합니다.
- 쿼리 패턴과 일치하는 복합 인덱스를 사용합니다 (`status, created_at`).
- `select *`를 피하고 필요한 컬럼만 프로젝션합니다.
- `saveAll`과 `hibernate.jdbc.batch_size` 설정을 통해 쓰기 작업을 일괄 처리합니다.

## 커넥션 풀링 (HikariCP)

권장 속성:
```
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.validation-timeout=5000
```

PostgreSQL LOB 처리를 위해 다음을 추가합니다:
```
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
```

## 캐싱 (Caching)

- 1차 캐시는 EntityManager 단위이므로, 트랜잭션 간에 엔티티를 유지하지 않도록 합니다.
- 읽기 작업이 많은 엔티티의 경우 2차 캐시를 신중하게 고려하고, 만료(eviction) 전략을 검증합니다.

## 마이그레이션 (Migrations)

- Flyway나 Liquibase를 사용하며, 운영 환경에서 Hibernate의 자동 DDL 생성에 의존하지 마십시오.
- 마이그레이션은 멱등성(idempotent)과 가산성(additive)을 유지해야 하며, 계획 없이 컬럼을 삭제하지 마십시오.

## 데이터 액세스 테스트

- 운영 환경과 동일한 환경을 위해 Testcontainers와 함께 `@DataJpaTest`를 사용하는 것을 선호합니다.
- 로그 설정을 통해 SQL 효율성을 확인합니다: `logging.level.org.hibernate.SQL=DEBUG` 및 파라미터 값 확인을 위한 `logging.level.org.hibernate.orm.jdbc.bind=TRACE`.

**기억하세요**: 엔티티는 가볍게, 쿼리는 의도적으로, 트랜잭션은 짧게 유지하십시오. 페치 전략과 프로젝션으로 N+1을 방지하고, 읽기/쓰기 경로에 맞게 인덱스를 구성하십시오.
