---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 테스트

> 이 파일은 [common/testing.md](../common/testing.md)을 TypeScript/JavaScript 전용 내용으로 확장합니다.

## 테스트 프레임워크

- **Jest** 또는 **Vitest**: 단위 및 통합 테스트
- **Playwright**: E2E 테스트 (핵심 사용자 흐름)
- **Testing Library** (`@testing-library/react` 등): UI 컴포넌트 테스트

## 단위 테스트 패턴

```typescript
// Jest / Vitest 모두 동일한 구조 사용
describe('calculateDiscount', () => {
  it('유효한 할인율을 올바르게 적용한다', () => {
    // Arrange
    const price = 100
    const discountPct = 20

    // Act
    const result = calculateDiscount(price, discountPct)

    // Assert
    expect(result).toBe(80)
  })

  it('할인율이 0이면 원래 가격을 반환한다', () => {
    expect(calculateDiscount(100, 0)).toBe(100)
  })

  it('할인율이 음수이면 에러를 던진다', () => {
    expect(() => calculateDiscount(100, -5)).toThrow('할인율은 0 이상이어야 합니다')
  })
})
```

## 커버리지 설정

Jest (`jest.config.ts`):

```typescript
export default {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
}
```

Vitest (`vitest.config.ts`):

```typescript
// provider: 'v8'은 @vitest/coverage-v8 패키지 필요, 'istanbul'은 @vitest/coverage-istanbul 필요
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
    },
  },
})
```

## Mock 허용 범위

- **허용**: 외부 API, 데이터베이스, 파일 시스템, 시간(`Date.now`), 환경 변수
- **지양**: 내부 비즈니스 로직, 순수 함수 — 실제 구현을 직접 호출하십시오
- **금지**: 테스트 대상 모듈 자체를 모킹하는 행위

```typescript
// 양호 — 외부 의존성만 모킹
vi.mock('../lib/httpClient')
vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

// 불량 — 테스트 대상 자체를 모킹 (orderService 테스트 파일에서 orderService를 모킹하는 행위)
vi.mock('../services/orderService')
```

## E2E 테스트

핵심 사용자 흐름에 **Playwright**를 사용합니다:

```typescript
import { test, expect } from '@playwright/test'

test('주문 생성 흐름', async ({ page }) => {
  await page.goto('/orders/new')
  await page.fill('[name=customer]', 'Alice')
  await page.click('button[type=submit]')
  await expect(page.locator('[data-testid=success-message]')).toBeVisible()
})
```

## 에이전트 지원

- **tdd-guide** — 새로운 기능 개발 시 테스트 먼저 작성 강제
- **e2e-runner** — Playwright E2E 테스트 전문
