---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 보안

> 이 파일은 [common/security.md](../common/security.md)을 TypeScript/JavaScript 전용 내용으로 확장합니다.

## 비밀 정보 관리

```typescript
// 불량 — 하드코딩된 비밀 정보
const apiKey = "sk-proj-xxxxx"

// 양호 — 환경 변수 사용
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('OPENAI_API_KEY가 설정되지 않았습니다')
}
```

## TypeScript 특화 보안 패턴

### eval 및 동적 코드 실행 금지

```typescript
// 불량 — 코드 인젝션 위험
eval(userInput)
new Function(userInput)()

// 양호 — 정적 로직 사용
const handlers: Record<string, () => void> = { action1: fn1, action2: fn2 }
handlers[userInput]?.()
```

### innerHTML / dangerouslySetInnerHTML

```typescript
// 불량 — XSS 취약점
element.innerHTML = userContent
// <div dangerouslySetInnerHTML={{ __html: userContent }} />

// 양호 — 텍스트만 삽입하거나 sanitizer 사용
element.textContent = userContent
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userContent)
```

### Prototype Pollution 방지

```typescript
// 불량 — 객체 병합 시 오염 가능
function merge(target: any, source: any) {
  for (const key in source) target[key] = source[key]
}

// 양호 — 안전한 병합
const merged = { ...defaults, ...userConfig }
```

### SSRF 방지

```typescript
// 불량 — 사용자 입력을 URL로 직접 사용
const response = await fetch(req.body.url)

// 양호 — 허용 목록(allowlist) 검증
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com']
const url = new URL(req.body.url)
if (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('허용되지 않은 호스트')
const response = await fetch(url.toString())
```

### JWT 검증

```typescript
// 불량 — 서명 검증 없이 디코딩만
const payload = JSON.parse(atob(token.split('.')[1]))

// 양호 — 검증된 라이브러리로 서명까지 확인 (환경 변수 명시적 가드 포함)
import { verify } from 'jsonwebtoken'
const secret = process.env.JWT_SECRET
if (!secret) throw new Error('JWT_SECRET이 설정되지 않았습니다')
const payload = verify(token, secret)
```

## 에이전트 지원

- **security-reviewer** 에이전트를 사용하여 포괄적인 보안 감사를 수행하십시오
