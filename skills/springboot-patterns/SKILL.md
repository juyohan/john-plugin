---
name: springboot-patterns
description: Spring Boot 아키텍처 패턴, REST API 설계, 계층화된 서비스, 데이터 액세스, 캐싱, 비동기 처리 및 로깅. Java Spring Boot 백엔드 작업을 위해 사용합니다.
origin: ECC
---

# Spring Boot 개발 패턴

확장 가능하고 운영 환경에 적합한 서비스를 위한 Spring Boot 아키텍처 및 API 패턴입니다.

## 활성화 시점

- Spring MVC 또는 WebFlux를 사용하여 REST API를 구축할 때
- 컨트롤러 → 서비스 → 리포지토리 계층 구조를 설계할 때
- Spring Data JPA, 캐싱 또는 비동기 처리를 설정할 때
- 유효성 검사, 예외 처리 또는 페이지네이션을 추가할 때
- 개발/스테이징/운영 환경별 프로파일을 설정할 때
- Spring Events 또는 Kafka를 사용하여 이벤트 기반 패턴을 구현할 때

## REST API 구조

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## 리포지토리 패턴 (Spring Data JPA)

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## 트랜잭션이 포함된 서비스 계층

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }
}
```

## DTO 및 유효성 검사 (Validation)

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}

public record MarketResponse(Long id, String name, MarketStatus status) {
  static MarketResponse from(Market market) {
    return new MarketResponse(market.id(), market.name(), market.status());
  }
}
```

## 예외 처리 (Exception Handling)

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // 예기치 않은 에러는 스택 트레이스와 함께 로깅합니다.
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Internal server error"));
  }
}
```

## 캐싱 (Caching)

설정 클래스에 `@EnableCaching`이 필요합니다.

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Market not found"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## 비동기 처리 (Async Processing)

설정 클래스에 `@EnableAsync`가 필요합니다.

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // 이메일/SMS 전송 로직
    return CompletableFuture.completedFuture(null);
  }
}
```

## 로깅 (SLF4J)

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // 로직 수행
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## 미들웨어 / 필터 (Filters)

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## 페이지네이션 및 정렬

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## 에러 복구 기능이 있는 외부 호출 (Retry)

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) {
        throw ex;
      }
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## 처리량 제한 (Filter + Bucket4j)

**보안 주의**: `X-Forwarded-For` 헤더는 클라이언트가 변조할 수 있으므로 기본적으로 신뢰할 수 없습니다.
다음 조건이 충족될 때만 전달된(forwarded) 헤더를 사용하십시오:
1. 애플리케이션이 신뢰할 수 있는 리버스 프록시(nginx, AWS ALB 등) 뒤에 있음
2. `ForwardedHeaderFilter`를 빈(bean)으로 등록함
3. 애플리케이션 속성에 `server.forward-headers-strategy=NATIVE` 또는 `FRAMEWORK`를 설정함
4. 프록시가 `X-Forwarded-For` 헤더를 추가가 아닌 덮어쓰도록 설정됨

`ForwardedHeaderFilter`가 올바르게 설정되면, `request.getRemoteAddr()`는 자동으로 전달된 헤더에서 올바른 클라이언트 IP를 반환합니다. 이 설정이 없다면 `request.getRemoteAddr()`를 직접 사용하십시오. 이는 신뢰할 수 있는 유일한 값인 즉각적인 연결 IP를 반환합니다.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  /*
   * 보안: 이 필터는 처리량 제한을 위해 클라이언트를 식별할 때 request.getRemoteAddr()를 사용합니다.
   *
   * 애플리케이션이 리버스 프록시(nginx, AWS ALB 등) 뒤에 있는 경우, 정확한 클라이언트 IP 감지를 위해
   * Spring이 전달된 헤더를 올바르게 처리하도록 설정해야 합니다:
   *
   * 1. application.properties/yaml에 server.forward-headers-strategy=NATIVE (클라우드 플랫폼용) 
   *    또는 FRAMEWORK를 설정합니다.
   * 2. FRAMEWORK 전략을 사용하는 경우, ForwardedHeaderFilter를 등록합니다:
   *
   *    @Bean
   *    ForwardedHeaderFilter forwardedHeaderFilter() {
   *        return new ForwardedHeaderFilter();
   *    }
   *
   * 3. 프록시가 변조를 방지하기 위해 X-Forwarded-For 헤더를 (추가가 아닌) 덮어쓰도록 설정합니다.
   * 4. 컨테이너에 대해 server.tomcat.remoteip.trusted-proxies 또는 이에 상응하는 설정을 합니다.
   *
   * 이 설정이 없으면 request.getRemoteAddr()은 클라이언트 IP가 아닌 프록시 IP를 반환합니다.
   * X-Forwarded-For를 직접 읽지 마십시오. 신뢰할 수 있는 프록시 처리 없이는 매우 쉽게 변조될 수 있습니다.
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // ForwardedHeaderFilter가 설정된 경우 올바른 클라이언트 IP를 반환하고, 
    // 그렇지 않은 경우 직접 연결 IP를 반환하는 getRemoteAddr()를 사용합니다.
    // 적절한 프록시 설정 없이 X-Forwarded-For 헤더를 직접 신뢰하지 마십시오.
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## 백그라운드 작업 (Background Jobs)

Spring의 `@Scheduled`를 사용하거나 큐(Kafka, SQS, RabbitMQ 등)와 연동합니다. 핸들러는 멱등성(idempotent)을 유지하고 관찰 가능해야 합니다.

## 관찰 가능성 (Observability)

- Logback 인코더를 통한 구조화된 로깅 (JSON)
- 메트릭: Micrometer + Prometheus/OTel
- 트레이싱: OpenTelemetry 또는 Brave 백엔드를 포함한 Micrometer Tracing

## 운영 환경 기본값

- 필드 주입을 피하고 생성자 주입을 선호합니다.
- RFC 7807 에러 처리를 위해 `spring.mvc.problemdetails.enabled=true`를 활성화합니다 (Spring Boot 3+).
- 워크로드에 맞게 HikariCP 풀 크기를 구성하고 타임아웃을 설정합니다.
- 조회 작업에는 `@Transactional(readOnly = true)`를 사용합니다.
- 적절한 곳에 `@NonNull`과 `Optional`을 사용하여 null 안전성을 강제합니다.

**기억하세요**: 컨트롤러는 얇게, 서비스는 집중도 있게, 리포지토리는 단순하게 유지하고, 에러 처리는 중앙에서 관리하십시오. 유지보수성과 테스트 가능성을 최적화하십시오.
