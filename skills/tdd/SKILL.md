---
name: tdd
description: 새로운 기능 작성, 버그 수정, 코드 리팩토링 시 사용합니다. 80% 이상의 커버리지(단위, 통합, E2E 테스트 포함)를 갖춘 테스트 주도 개발을 강제합니다.
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# 테스트 주도 개발(TDD) 워크플로우

이 스킬은 모든 코드 개발이 포괄적인 테스트 커버리지와 함께 TDD 원칙을 따르도록 보장합니다.

## 활성화 시점

- 새로운 기능 또는 기능을 작성할 때
- 버그 또는 이슈를 수정할 때
- 기존 코드를 리팩토링할 때
- API 엔드포인트를 추가할 때
- 새로운 컴포넌트를 생성할 때

## 핵심 원칙

### 1. 코드보다 테스트 먼저
항상 테스트를 먼저 작성한 후, 테스트를 통과하도록 코드를 구현하십시오.

### 2. 커버리지 요구사항
- 최소 80% 커버리지 (단위 + 통합 + E2E)
- 모든 엣지 케이스(edge case) 커버
- 에러 시나리오 테스트
- 경계 조건(boundary condition) 검증

### 3. 테스트 유형

#### 단위 테스트(Unit Tests)
- 개별 함수 및 유틸리티
- 컴포넌트 로직
- 순수 함수(pure function)
- 헬퍼(helper) 및 유틸리티

#### 통합 테스트(Integration Tests)
- API 엔드포인트
- 데이터베이스 작업
- 서비스 상호작용
- 외부 API 호출

#### E2E 테스트(Playwright)
- 핵심 사용자 흐름
- 완전한 워크플로우(workflow)
- 브라우저 자동화
- UI 인터랙션

## TDD 워크플로우 7단계

### 1단계: 사용자 여정(User Journey) 작성
```
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for markets semantically,
so that I can find relevant markets even without exact keywords.
```

### 2단계: 테스트 케이스 생성
각 사용자 여정에 대해 포괄적인 테스트 케이스를 작성합니다:

```typescript
describe('Semantic Search', () => {
  it('returns relevant markets for query', async () => {
    // Test implementation
  })

  it('handles empty query gracefully', async () => {
    // Test edge case
  })

  it('falls back to substring search when Redis unavailable', async () => {
    // Test fallback behavior
  })

  it('sorts results by similarity score', async () => {
    // Test sorting logic
  })
})
```

### 3단계: 테스트 실행 (실패해야 합니다)
```bash
npm test
# Tests should fail - we haven't implemented yet
```

### 4단계: 코드 구현
테스트를 통과할 최소한의 코드를 작성합니다:

```typescript
// Implementation guided by tests
export async function searchMarkets(query: string) {
  // Implementation here
}
```

### 5단계: 테스트 재실행
```bash
npm test
# Tests should now pass
```

### 6단계: 리팩토링
테스트를 통과 상태(green)로 유지하면서 코드 품질을 개선합니다:
- 중복 제거
- 네이밍 개선
- 성능 최적화
- 가독성 향상

### 7단계: 커버리지 검증
```bash
npm run test:coverage
# Verify 80%+ coverage achieved
```

## 테스트 패턴

### 단위 테스트 패턴 (Jest/Vitest)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### API 통합 테스트 패턴
```typescript
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/markets', () => {
  it('returns markets successfully', async () => {
    const request = new NextRequest('http://localhost/api/markets')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('validates query parameters', async () => {
    const request = new NextRequest('http://localhost/api/markets?limit=invalid')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('handles database errors gracefully', async () => {
    // Mock database failure
    const request = new NextRequest('http://localhost/api/markets')
    // Test error handling
  })
})
```

### E2E 테스트 패턴 (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can search and filter markets', async ({ page }) => {
  // Navigate to markets page
  await page.goto('/')
  await page.click('a[href="/markets"]')

  // Verify page loaded
  await expect(page.locator('h1')).toContainText('Markets')

  // Search for markets
  await page.fill('input[placeholder="Search markets"]', 'election')

  // Wait for debounce and results
  await page.waitForTimeout(600)

  // Verify search results displayed
  const results = page.locator('[data-testid="market-card"]')
  await expect(results).toHaveCount(5, { timeout: 5000 })

  // Verify results contain search term
  const firstResult = results.first()
  await expect(firstResult).toContainText('election', { ignoreCase: true })

  // Filter by status
  await page.click('button:has-text("Active")')

  // Verify filtered results
  await expect(results).toHaveCount(3)
})

test('user can create a new market', async ({ page }) => {
  // Login first
  await page.goto('/creator-dashboard')

  // Fill market creation form
  await page.fill('input[name="name"]', 'Test Market')
  await page.fill('textarea[name="description"]', 'Test description')
  await page.fill('input[name="endDate"]', '2025-12-31')

  // Submit form
  await page.click('button[type="submit"]')

  // Verify success message
  await expect(page.locator('text=Market created successfully')).toBeVisible()

  // Verify redirect to market page
  await expect(page).toHaveURL(/\/markets\/test-market/)
})
```

## 테스트 파일 구조

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx          # Unit tests
│   │   └── Button.stories.tsx       # Storybook
│   └── MarketCard/
│       ├── MarketCard.tsx
│       └── MarketCard.test.tsx
├── app/
│   └── api/
│       └── markets/
│           ├── route.ts
│           └── route.test.ts         # Integration tests
└── e2e/
    ├── markets.spec.ts               # E2E tests
    ├── trading.spec.ts
    └── auth.spec.ts
```

## 외부 서비스 목킹(Mocking)

### Supabase 목
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Test Market' }],
          error: null
        }))
      }))
    }))
  }
}))
```

### Redis 목
```typescript
jest.mock('@/lib/redis', () => ({
  searchMarketsByVector: jest.fn(() => Promise.resolve([
    { slug: 'test-market', similarity_score: 0.95 }
  ])),
  checkRedisHealth: jest.fn(() => Promise.resolve({ connected: true }))
}))
```

### OpenAI 목
```typescript
jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(
    new Array(1536).fill(0.1) // Mock 1536-dim embedding
  ))
}))
```

## 테스트 커버리지 검증

### 커버리지 리포트 실행
```bash
npm run test:coverage
```

### 커버리지 임계값(Coverage Thresholds)
```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## 일반적인 테스트 실수

### FAIL: 구현 세부사항 테스트
```typescript
// Don't test internal state
expect(component.state.count).toBe(5)
```

### PASS: 사용자 가시적 동작 테스트
```typescript
// Test what users see
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### FAIL: 취약한 셀렉터(Brittle Selectors)
```typescript
// Breaks easily
await page.click('.css-class-xyz')
```

### PASS: 시맨틱 셀렉터(Semantic Selectors)
```typescript
// Resilient to changes
await page.click('button:has-text("Submit")')
await page.click('[data-testid="submit-button"]')
```

### FAIL: 테스트 격리 없음
```typescript
// Tests depend on each other
test('creates user', () => { /* ... */ })
test('updates same user', () => { /* depends on previous test */ })
```

### PASS: 독립적인 테스트
```typescript
// Each test sets up its own data
test('creates user', () => {
  const user = createTestUser()
  // Test logic
})

test('updates user', () => {
  const user = createTestUser()
  // Update logic
})
```

## 지속적 테스팅(Continuous Testing)

### 개발 중 Watch 모드
```bash
npm test -- --watch
# Tests run automatically on file changes
```

### 커밋 전 훅(Pre-Commit Hook)
```bash
# Runs before every commit
npm test && npm run lint
```

### CI/CD 통합
```yaml
# GitHub Actions
- name: Run Tests
  run: npm test -- --coverage
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## 모범 사례

1. **테스트 먼저 작성** - 항상 TDD 원칙을 따릅니다
2. **테스트당 하나의 검증** - 단일 동작에 집중합니다
3. **서술적인 테스트 이름** - 무엇을 테스트하는지 설명합니다
4. **Arrange-Act-Assert** - 명확한 테스트 구조를 유지합니다
5. **외부 의존성 목킹** - 단위 테스트를 격리합니다
6. **엣지 케이스 테스트** - Null, undefined, 빈 값, 대용량 처리
7. **에러 경로 테스트** - 해피 패스(happy path)만이 아닌 전체 경로
8. **빠른 테스트 유지** - 단위 테스트는 각각 50ms 미만
9. **테스트 후 정리** - 사이드 이펙트(side effect) 없음
10. **커버리지 리포트 검토** - 누락된 부분을 파악합니다

## 성공 지표

- 80% 이상의 코드 커버리지 달성
- 모든 테스트 통과 (green)
- 스킵되거나 비활성화된 테스트 없음
- 빠른 테스트 실행 (단위 테스트 < 30초)
- E2E 테스트가 핵심 사용자 흐름 커버
- 프로덕션 전에 버그를 테스트로 포착

---

**기억하기**: 테스트는 선택 사항이 아닙니다. 테스트는 자신 있는 리팩토링, 빠른 개발, 그리고 프로덕션 안정성을 가능하게 하는 안전망입니다.
