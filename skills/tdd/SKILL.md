---
name: tdd
description: 새로운 기능 작성, 버그 수정, 코드 리팩토링 시 사용합니다. 80% 이상의 커버리지(단위, 통합, E2E 테스트 포함)를 갖춘 테스트 주도 개발을 강제합니다.
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.

# TDD 워크플로우

## 활성화 시점

- 새로운 기능 또는 API 엔드포인트를 추가할 때
- 버그를 수정할 때
- 기존 코드를 리팩토링할 때

## 테스트 유형 및 우선순위

### 1. 통합 테스트 (우선)

자신이 소유한 서비스(DB, 캐시, API 서버)는 실제로 띄워서 테스트합니다.
실 의존성 기반 통합 테스트가 Mock 기반 단위 테스트보다 더 많은 결함을 조기에 잡습니다.

테스트 범위:
- API 엔드포인트 전체 흐름 (요청 → 서비스 → DB → 응답)
- DB 쿼리 및 트랜잭션
- 서비스 간 상호작용
- 에러 전파 및 롤백

**환경 구성:** docker-compose로 테스트 전용 DB/캐시를 띄우거나, CI 서비스 컨테이너를 사용합니다.

```bash
# 테스트 전 의존성 실행 예시
docker-compose -f docker-compose.test.yml up -d
npm run test:integration
docker-compose -f docker-compose.test.yml down
```

### 2. 단위 테스트

로직이 복잡한 순수 함수와 유틸리티에 집중합니다:
- 비즈니스 규칙 계산 함수
- 데이터 변환 유틸리티
- 컴포넌트 렌더링 로직

### 3. E2E 테스트 (Playwright)

핵심 사용자 흐름만 커버합니다 — 모든 시나리오를 E2E로 만들지 마십시오:
- 핵심 사용자 여정 (가입, 로그인, 핵심 기능)
- 브라우저 자동화가 필요한 인터랙션

## Mock 허용 범위

자신이 소유하지 않은 **외부 써드파티 API 경계에서만** Mock을 사용합니다:
결제(Stripe, Toss), SMS(Twilio), 이메일(SendGrid), 지도(Google Maps) 등.

자신이 소유한 DB, 캐시, 내부 API는 실제 인스턴스를 사용합니다.

## TDD 7단계

1. **사용자 여정 작성** — `As a [role], I want to [action], so that [benefit]`
2. **테스트 케이스 작성** — happy path, edge case, 에러 시나리오 포함
3. **테스트 실행** — 실패해야 합니다 (RED)
4. **코드 구현** — 테스트를 통과할 최소한의 코드
5. **테스트 재실행** — 통과해야 합니다 (GREEN)
6. **리팩토링** — 중복 제거, 네이밍 개선, 테스트는 green 유지
7. **커버리지 검증** — 80% 이상 확인 (`npm run test:coverage`)

## 테스트 파일 구조

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx        # 단위 테스트
├── app/
│   └── api/
│       └── users/
│           ├── route.ts
│           └── route.test.ts      # 통합 테스트 (실 DB 사용)
└── e2e/
    └── users.spec.ts              # E2E 테스트
```

## 커버리지 기준

```json
{
  "coverageThresholds": {
    "global": { "branches": 80, "functions": 80, "lines": 80 }
  }
}
```

## 주의사항

**구현 세부사항이 아닌 동작을 테스트하십시오:**
```typescript
// ❌ 내부 상태 테스트
expect(component.state.count).toBe(5)
// ✅ 사용자 가시적 동작 테스트
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

**취약한 셀렉터를 피하십시오:**
```typescript
// ❌ CSS 클래스 — 스타일 변경에 깨짐
await page.click('.css-class-xyz')
// ✅ 시맨틱 셀렉터
await page.click('[data-testid="submit-button"]')
```

**각 테스트는 독립적이어야 합니다** — 테스트 간 공유 상태를 만들지 마십시오.
