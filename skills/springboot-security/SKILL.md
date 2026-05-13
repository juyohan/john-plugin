---
name: springboot-security
description: Java Spring Boot 서비스에서 인증/인가, 유효성 검사, CSRF, 비밀 정보, 헤더, 처리량 제한 및 의존성 보안을 위한 Spring Security 베스트 프랙티스.
origin: ECC
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.


# Spring Boot 보안 검토

인증 기능을 추가하거나, 입력을 처리하거나, 엔드포인트를 생성하거나, 비밀 정보를 다룰 때 사용합니다.

## 활성화 시점

- 인증 기능을 추가할 때 (JWT, OAuth2, 세션 기반)
- 인가 기능을 구현할 때 (@PreAuthorize, 역할 기반 액세스)
- 사용자 입력을 검증할 때 (Bean Validation, 사용자 정의 검증기)
- CORS, CSRF 또는 보안 헤더를 설정할 때
- 비밀 정보를 관리할 때 (Vault, 환경 변수)
- 처리량 제한(Rate limiting) 또는 브루트 포스 방지 기능을 추가할 때
- 의존성에서 CVE(알려진 취약점)를 스캔할 때

## 인증 (Authentication)

- 상태가 없는 JWT 또는 취소 목록(revocation list)이 포함된 불투명 토큰(opaque tokens)을 선호합니다.
- 세션의 경우 `httpOnly`, `Secure`, `SameSite=Strict` 쿠키를 사용합니다.
- `OncePerRequestFilter` 또는 리소스 서버에서 토큰을 검증합니다.

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      Authentication auth = jwtService.authenticate(token);
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## 인가 (Authorization)

- 메서드 보안을 활성화합니다: `@EnableMethodSecurity`.
- `@PreAuthorize("hasRole('ADMIN')")` 또는 `@PreAuthorize("@authz.canEdit(#id)")`를 사용합니다.
- 기본적으로 거부(Deny by default)하고, 필요한 스코프만 노출합니다.

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/users")
  public List<UserDto> listUsers() {
    return userService.findAll();
  }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

## 입력 검증 (Input Validation)

- 컨트롤러에서 `@Valid`와 함께 Bean Validation을 사용합니다.
- DTO에 제약 조건을 적용합니다: `@NotBlank`, `@Email`, `@Size`, 사용자 정의 검증기 등.
- 렌더링 전에는 화이트리스트를 사용하여 모든 HTML을 정제(Sanitize)합니다.

```java
// 불량: 유효성 검사 없음
@PostMapping("/users")
public User createUser(@RequestBody UserDto dto) {
  return userService.create(dto);
}

// 양호: 검증된 DTO
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED)
      .body(userService.create(dto));
}
```

## SQL 인젝션 방지 (SQL Injection Prevention)

- Spring Data 리포지토리나 파라미터화된 쿼리를 사용합니다.
- 네이티브 쿼리의 경우 `:param` 바인딩을 사용하고, 문자열을 직접 결합하지 마십시오.

```java
// 불량: 네이티브 쿼리에서 문자열 결합 사용
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// 양호: 파라미터화된 네이티브 쿼리
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// 양호: Spring Data 쿼리 메서드 (자동으로 파라미터화됨)
List<User> findByEmailAndActiveTrue(String email);
```

## 비밀번호 인코딩 (Password Encoding)

- 항상 BCrypt나 Argon2로 비밀번호를 해싱하십시오. 절대 평문으로 저장하지 마십시오.
- 수동 해싱이 아닌 `PasswordEncoder` 빈(bean)을 사용하십시오.

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12); // cost factor 12
}

// 서비스에서 사용 시
public User register(CreateUserDto dto) {
  String hashedPassword = passwordEncoder.encode(dto.password());
  return userRepository.save(new User(dto.email(), hashedPassword));
}
```

## CSRF 방지

- 브라우저 세션 기반 애플리케이션의 경우 CSRF를 활성화 상태로 유지하고, 폼/헤더에 토큰을 포함하십시오.
- Bearer 토큰을 사용하는 순수 API의 경우 CSRF를 비활성화하고 상태 없는 인증에 의존하십시오.

```java
http
  .csrf(csrf -> csrf.disable())
  .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

## 비밀 정보 관리 (Secrets Management)

- 소스 코드에 비밀 정보를 넣지 말고, 환경 변수나 Vault에서 로드하십시오.
- `application.yml`에 자격 증명을 직접 넣지 말고 플레이스홀더를 사용하십시오.
- 토큰과 DB 자격 증명을 주기적으로 교체하십시오.

```yaml
# 불량: application.yml에 하드코딩됨
spring:
  datasource:
    password: mySecretPassword123

# 양호: 환경 변수 플레이스홀더 사용
spring:
  datasource:
    password: ${DB_PASSWORD}

# 양호: Spring Cloud Vault 연동
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
```

## 보안 헤더 (Security Headers)

```java
http
  .headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
      .policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .xssProtection(Customizer.withDefaults())
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## CORS 설정

- 컨트롤러별이 아닌 보안 필터 레벨에서 CORS를 설정하십시오.
- 허용된 오리진(Origins)을 제한하십시오. 운영 환경에서 `*`를 사용하지 마십시오.

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  config.setAllowCredentials(true);
  config.setMaxAge(3600L);

  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}

// SecurityFilterChain에서 사용 시:
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
```

## 처리량 제한 (Rate Limiting)

- 비용이 많이 드는 엔드포인트에 Bucket4j 또는 게이트웨이 레벨의 제한을 적용하십시오.
- 갑작스러운 요청 급증(bursts)을 로깅하고 알림을 설정하며, 재시도 힌트와 함께 429 상태 코드를 반환하십시오.

```java
// Bucket4j를 사용한 엔드포인트별 처리량 제한 예시
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
    }
  }
}
```

## 의존성 보안 (Dependency Security)

- CI 환경에서 OWASP Dependency Check / Snyk을 실행하십시오.
- Spring Boot 및 Spring Security를 지원되는 최신 버전으로 유지하십시오.
- 알려진 CVE가 있는 경우 빌드를 실패하도록 설정하십시오.

## 로깅 및 개인정보 (PII)

- 비밀 정보, 토큰, 비밀번호 또는 전체 카드 번호(PAN) 데이터를 로그에 남기지 마십시오.
- 민감한 필드는 마스킹 처리하고, 구조화된 JSON 로깅을 사용하십시오.

## 파일 업로드

- 크기, 콘텐츠 타입 및 확장자를 검증하십시오.
- 웹 루트(web root) 외부의 저장소에 저장하고, 필요한 경우 스캔을 수행하십시오.

## 출시 전 체크리스트

- [ ] 인증 토큰이 올바르게 검증되고 만료되는가?
- [ ] 모든 민감한 경로에 인가 가드(Authorization guards)가 설정되어 있는가?
- [ ] 모든 입력값이 검증되고 정제(sanitize)되었는가?
- [ ] 문자열 결합을 사용한 SQL이 없는가?
- [ ] 앱 타입에 맞게 CSRF 설정이 되어 있는가?
- [ ] 비밀 정보가 외부화되었으며 코드에 포함되지 않았는가?
- [ ] 보안 헤더가 설정되었는가?
- [ ] API에 처리량 제한(Rate limiting)이 적용되었는가?
- [ ] 의존성이 스캔되었으며 최신 상태인가?
- [ ] 로그에 민감한 데이터가 포함되어 있지 않은가?

**기억하세요**: 기본적으로 거부하고, 입력을 검증하며, 최소 권한 원칙을 따르고, 설정에 의한 보안을 우선하십시오.
