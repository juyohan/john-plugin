---
name: vite
description: Vite 빌드 도구 패턴 — 설정, 플러그인, HMR, 환경 변수, 프록시 설정, SSR, 라이브러리 모드, 의존성 사전 번들링, 빌드 최적화. vite.config.ts, Vite 플러그인, 또는 Vite 기반 프로젝트 작업 시 활성화.
origin: ECC
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# Vite 패턴

Vite 8+ 프로젝트를 위한 빌드 도구 및 개발 서버 패턴. 설정, 환경 변수, 프록시 설정, 라이브러리 모드, 의존성 사전 번들링, 일반적인 프로덕션 함정을 다룹니다.

## 사용 시점

- `vite.config.ts` 또는 `vite.config.js` 설정 시
- 환경 변수 또는 `.env` 파일 설정 시
- API 백엔드를 위한 개발 서버 프록시 설정 시
- 빌드 출력 최적화 시 (청크, 축소화, 에셋)
- `build.lib`으로 라이브러리 배포 시
- 의존성 사전 번들링 또는 CJS/ESM 상호 운용 문제 해결 시
- HMR, 개발 서버, 빌드 에러 디버깅 시
- Vite 플러그인 선택 또는 순서 결정 시

## 작동 방식

- **개발 모드(Dev mode)**는 소스 파일을 네이티브 ESM으로 제공합니다 — 번들링 없음. 변환은 모듈 요청별로 온디맨드로 발생하므로 콜드 스타트가 빠르고 HMR이 정확합니다.
- **빌드 모드(Build mode)**는 Rolldown(v7+) 또는 Rollup(v5–v6)을 사용하여 트리 쉐이킹(tree-shaking), 코드 분할(code-splitting), Oxc 기반 축소화로 프로덕션용 앱을 번들링합니다.
- **의존성 사전 번들링(Dependency pre-bundling)**은 esbuild를 통해 CJS/UMD 의존성을 ESM으로 한 번 변환하고 `node_modules/.vite`에 결과를 캐시하므로 이후 시작 시 작업을 건너뜁니다.
- **플러그인(Plugins)**은 개발과 빌드 모두에서 통합 인터페이스를 공유합니다 — 동일한 플러그인 객체가 개발 서버의 온디맨드 변환과 프로덕션 파이프라인 모두에서 작동합니다.
- **환경 변수(Environment variables)**는 빌드 시 정적으로 인라인됩니다. `VITE_` 접두사가 붙은 변수는 번들의 공개 상수가 되고, 접두사가 없는 변수는 클라이언트 코드에서 보이지 않습니다.

## 예시

### 설정 구조

#### 기본 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
})
```

#### 조건부 설정

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())   // VITE_ prefixed only (safe)

  return {
    plugins: [react()],
    server: command === 'serve' ? { port: 3000 } : undefined,
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})
```

#### 주요 설정 옵션

| 키 | 기본값 | 설명 |
|-----|---------|-------------|
| `root` | `'.'` | 프로젝트 루트 (`index.html`이 있는 위치) |
| `base` | `'/'` | 배포된 에셋의 공개 기본 경로 |
| `envPrefix` | `'VITE_'` | 클라이언트에 노출되는 환경 변수 접두사 |
| `build.outDir` | `'dist'` | 출력 디렉토리 |
| `build.minify` | `'oxc'` | 축소기 (`'oxc'`, `'terser'`, 또는 `false`) |
| `build.sourcemap` | `false` | `true`, `'inline'`, 또는 `'hidden'` |

### 플러그인

#### 필수 플러그인

대부분의 플러그인 필요는 잘 관리된 몇 가지 패키지로 해결됩니다. 직접 작성하기 전에 이것들을 먼저 사용하십시오.

| 플러그인 | 목적 | 사용 시점 |
|--------|---------|-------------|
| `@vitejs/plugin-react-swc` | SWC를 통한 React HMR + Fast Refresh | React 앱의 기본값 (Babel 버전보다 빠름) |
| `@vitejs/plugin-react` | Babel을 통한 React HMR + Fast Refresh | Babel 플러그인이 필요한 경우만 (emotion, MobX 데코레이터) |
| `@vitejs/plugin-vue` | Vue 3 SFC 지원 | Vue 앱 |
| `vite-plugin-checker` | 워커 스레드에서 `tsc` + ESLint를 HMR 오버레이와 함께 실행 | **모든 TypeScript 앱** — Vite는 `vite build` 중 타입 체크를 하지 않음 |
| `vite-tsconfig-paths` | `tsconfig.json` `paths` 별칭 적용 | `tsconfig.json`에 이미 별칭이 있는 경우 |
| `vite-plugin-dts` | 라이브러리 모드에서 `.d.ts` 파일 생성 | TypeScript 라이브러리 배포 시 |
| `vite-plugin-svgr` | SVG를 React 컴포넌트로 임포트 | SVG를 컴포넌트로 사용하는 React 앱 |
| `rollup-plugin-visualizer` | 번들 트리맵/선버스트 리포트 | 주기적인 번들 크기 감사 (`enforce: 'post'` 사용) |
| `vite-plugin-pwa` | 제로 설정 PWA + Workbox | 오프라인 지원 앱 |

**중요 주의사항:** `vite build`는 트랜스파일하지만 타입 체크를 하지 않습니다. `vite-plugin-checker`를 추가하거나 CI에서 `tsc --noEmit`을 실행하지 않으면 타입 에러가 프로덕션에 그대로 배포됩니다.

#### 커스텀 플러그인 작성

작성이 필요한 경우는 드뭅니다 — 대부분의 필요는 기존 플러그인으로 해결됩니다. 필요할 때는 `vite.config.ts`에 인라인으로 시작하고 재사용될 때만 추출하십시오.

```typescript
// vite.config.ts — minimal inline plugin
function myPlugin(): Plugin {
  return {
    name: 'my-plugin',                       // required, must be unique
    enforce: 'pre',                           // 'pre' | 'post' (optional)
    apply: 'build',                           // 'build' | 'serve' (optional)
    transform(code, id) {
      if (!id.endsWith('.custom')) return
      return { code: transformCustom(code), map: null }
    },
  }
}
```

**주요 훅:** `transform`(소스 수정), `resolveId` + `load`(가상 모듈), `transformIndexHtml`(HTML에 주입), `configureServer`(개발 미들웨어 추가), `hotUpdate`(커스텀 HMR — v7+에서 더 이상 사용되지 않는 `handleHotUpdate` 대체).

**가상 모듈(Virtual modules)**은 `\0` 접두사 규칙을 사용합니다 — `resolveId`가 `'\0virtual:my-id'`를 반환하여 다른 플러그인이 건너뜁니다. 사용자 코드는 `'virtual:my-id'`를 임포트합니다.

전체 플러그인 API는 [vite.dev/guide/api-plugin](https://vite.dev/guide/api-plugin)을 참조하십시오. 개발 중 변환 파이프라인 디버깅에는 `vite-plugin-inspect`를 사용하십시오.

### HMR API

프레임워크 플러그인(`@vitejs/plugin-react`, `@vitejs/plugin-vue` 등)이 HMR을 자동으로 처리합니다. `import.meta.hot`을 직접 사용하는 경우는 업데이트 간 상태를 유지해야 하는 커스텀 상태 스토어, 개발 도구, 또는 프레임워크 무관 유틸리티를 구축할 때만입니다.

```typescript
// src/store.ts — manual HMR for a vanilla module
if (import.meta.hot) {
  // Persist state across updates (must MUTATE, never reassign .data)
  import.meta.hot.data.count = import.meta.hot.data.count ?? 0

  // Cleanup side effects before module is replaced
  import.meta.hot.dispose((data) => clearInterval(data.intervalId))

  // Accept this module's own updates
  import.meta.hot.accept()
}
```

모든 `import.meta.hot` 코드는 프로덕션 빌드에서 트리 쉐이킹됩니다 — 가드 제거가 필요 없습니다.

### 환경 변수

Vite는 `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`을 순서대로 로드합니다(나중 것이 앞 것을 오버라이드); `*.local` 파일은 gitignore되며 로컬 시크릿(secret)용입니다.

#### 클라이언트 사이드 접근

`VITE_` 접두사가 붙은 변수만 클라이언트 코드에 노출됩니다:

```typescript
import.meta.env.VITE_API_URL   // string
import.meta.env.MODE            // 'development' | 'production' | custom
import.meta.env.BASE_URL        // base config value
import.meta.env.DEV             // boolean
import.meta.env.PROD            // boolean
import.meta.env.SSR             // boolean
```

#### 설정에서 환경 변수 사용

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())          // VITE_ prefixed only (safe)
  return {
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})
```

### 보안

#### `VITE_` 접두사는 보안 경계가 아닙니다

`VITE_` 접두사가 붙은 변수는 **빌드 시 클라이언트 번들에 정적으로 인라인됩니다**. 축소화, base64 인코딩, 소스 맵 비활성화로는 숨길 수 없습니다. 공격자는 배포된 JavaScript에서 어떤 `VITE_` 변수든 추출할 수 있습니다.

**규칙:** 공개 값(API URL, 기능 플래그, 공개 키)만 `VITE_` 변수에 넣으십시오. 시크릿(API 토큰, 데이터베이스 URL, 개인 키)은 반드시 API 또는 서버리스 함수 뒤에서 서버 사이드에서 처리해야 합니다.

#### `loadEnv('')` 함정

```typescript
// BAD: passing '' as the third arg loads ALL env vars — including server secrets —
// and makes them available to inline into client code via `define`.
const env = loadEnv(mode, process.cwd(), '')

// GOOD: explicit prefix list
const env = loadEnv(mode, process.cwd(), ['VITE_', 'APP_'])
```

#### 프로덕션 소스 맵

프로덕션 소스 맵은 원본 소스 코드를 노출합니다. 에러 트래커(Sentry, Bugsnag)에 업로드하고 이후 로컬에서 삭제하는 경우가 아니면 비활성화하십시오:

```typescript
build: {
  sourcemap: false,                                  // default — keep it this way
}
```

#### `.gitignore` 체크리스트

- `.env.local`, `.env.*.local` — 로컬 시크릿 오버라이드
- `dist/` — 빌드 출력
- `node_modules/.vite` — 사전 번들 캐시 (오래된 항목이 유령 에러를 유발함)

### 서버 프록시

```typescript
// vite.config.ts — server.proxy
server: {
  proxy: {
    '/foo': 'http://localhost:4567',                    // string shorthand

    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,                               // needed for virtual-hosted backends
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

WebSocket 프록시 설정에는 라우트 설정에 `ws: true`를 추가하십시오.

### 빌드 최적화

#### 수동 청크(Manual Chunks)

```typescript
// vite.config.ts — build.rolldownOptions
build: {
  rolldownOptions: {
    output: {
      // Object form: group specific packages
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
      },
    },
  },
}
```

```typescript
// Function form: split by heuristic
manualChunks(id) {
  if (id.includes('node_modules/react')) return 'react-vendor'
  if (id.includes('node_modules')) return 'vendor'
}
```

### 성능

#### 배럴 파일(Barrel Files) 피하기

배럴 파일(`index.ts`가 디렉토리의 모든 것을 다시 내보내는 방식)은 단일 심볼을 임포트할 때도 Vite가 다시 내보낸 모든 파일을 로드하도록 강제합니다. 이것이 공식 문서에서 지적한 개발 서버 속도 저하의 1위 원인입니다.

```typescript
// BAD — importing one util forces Vite to load the whole barrel
import { slash } from '@/utils'

// GOOD — direct import, only the one file is loaded
import { slash } from '@/utils/slash'
```

#### 임포트 확장자 명시하기

암묵적 확장자는 `resolve.extensions`를 통해 최대 6번의 파일시스템 검사를 강제합니다. 대규모 코드베이스에서는 이것이 누적됩니다.

```typescript
// BAD
import Component from './Component'

// GOOD
import Component from './Component.tsx'
```

`tsconfig.json` `allowImportingTsExtensions` + `resolve.extensions`를 실제로 사용하는 확장자만으로 좁히십시오.

#### 핫 경로 라우트 워밍업

`server.warmup.clientFiles`는 브라우저가 요청하기 전에 알려진 핫 엔트리를 사전 변환합니다 — 대규모 앱에서 콜드 로드 요청 워터폴을 제거합니다.

```typescript
// vite.config.ts
server: {
  warmup: {
    clientFiles: ['./src/main.tsx', './src/routes/**/*.tsx'],
  },
}
```

#### 느린 개발 서버 프로파일링

`vite dev`가 느리다고 느껴지면 `vite --profile`로 시작하고, 앱과 상호작용한 다음 `p+enter`를 눌러 `.cpuprofile`을 저장하십시오. [Speedscope](https://www.speedscope.app)에서 로드하면 어떤 플러그인이 시간을 잡아먹는지 — 보통 커뮤니티 플러그인의 `buildStart`, `config`, 또는 `configResolved` 훅 — 찾을 수 있습니다.

### 라이브러리 모드

npm 패키지를 배포할 때는 `build.lib`을 사용하십시오. 설정 세부사항보다 중요한 두 가지 함정:

1. **타입이 생성되지 않음** — `vite-plugin-dts`를 추가하거나 `tsc --emitDeclarationOnly`를 별도로 실행하십시오.
2. **피어 의존성은 반드시 외부화해야 함** — 목록에 없는 피어는 라이브러리에 번들되어 소비자에게 중복 런타임 에러를 유발합니다.

```typescript
// vite.config.ts
build: {
  lib: {
    entry: 'src/index.ts',
    formats: ['es', 'cjs'],
    fileName: (format) => `my-lib.${format}.js`,
  },
  rolldownOptions: {
    external: ['react', 'react-dom', 'react/jsx-runtime'],  // every peer dep
  },
}
```

### SSR 외부화(Externals)

베어(bare) `createServer({ middlewareMode: true })` 설정은 프레임워크 작성자 영역입니다. 대부분의 앱은 Nuxt, Remix, SvelteKit, Astro, 또는 TanStack Start를 사용해야 합니다. 프레임워크 사용자로서 *실제로* 조정하게 되는 것은 의존성이 SSR에서 문제를 일으킬 때의 외부화 설정입니다:

```typescript
// vite.config.ts — ssr options
ssr: {
  external: ['node-native-package'],           // keep as require() in SSR bundle
  noExternal: ['esm-only-package'],            // force-bundle into SSR output (fixes most SSR errors)
  target: 'node',                              // 'node' or 'webworker'
}
```

### 의존성 사전 번들링

Vite는 CJS/UMD를 ESM으로 변환하고 요청 수를 줄이기 위해 의존성을 사전 번들링합니다.

```typescript
// vite.config.ts — optimizeDeps
optimizeDeps: {
  include: [
    'lodash-es',                              // force pre-bundle known heavy deps
    'cjs-package',                            // CJS deps that cause interop issues
    'deep-lib/components/**',                 // glob for deep imports
  ],
  exclude: ['local-esm-package'],             // must be valid ESM if excluded
  force: true,                                // ignore cache, re-optimize (temporary debugging)
}
```

### 일반적인 함정

#### 개발과 빌드가 일치하지 않음

개발 모드는 변환에 esbuild/Rolldown을 사용하고, 빌드 모드는 번들링에 Rolldown을 사용합니다. CJS 라이브러리가 둘 사이에서 다르게 동작할 수 있습니다. 배포 전에 반드시 `vite build && vite preview`로 확인하십시오.

#### 배포 후 오래된 청크

새 빌드는 새 청크 해시를 생성합니다. 활성 세션이 있는 사용자는 더 이상 존재하지 않는 이전 파일명을 요청합니다. Vite에는 내장 솔루션이 없습니다. 완화 방법:

- 배포 윈도우 동안 이전 `dist/assets/` 파일을 활성 상태로 유지하기
- 라우터에서 동적 임포트 에러를 잡아 페이지 강제 새로고침하기

#### Docker와 컨테이너

Vite는 기본적으로 `localhost`에 바인딩되므로 컨테이너 외부에서 접근할 수 없습니다:

```typescript
// vite.config.ts — Docker/container setup
server: {
  host: true,                                  // bind 0.0.0.0
  hmr: { clientPort: 3000 },                   // if behind a reverse proxy
}
```

#### 모노레포 파일 접근

Vite는 파일 제공을 프로젝트 루트로 제한합니다. 루트 외부의 패키지는 차단됩니다:

```typescript
// vite.config.ts — monorepo file access
server: {
  fs: {
    allow: ['..'],                             // allow parent directory (workspace root)
  },
}
```

### 안티 패턴

```typescript
// BAD: Setting envPrefix to '' exposes ALL env vars (including secrets) to the client
envPrefix: ''

// BAD: Assuming require() works in application source code — Vite is ESM-first
const lib = require('some-lib')                // use import instead

// BAD: Splitting every node_module into its own chunk — creates hundreds of tiny files
manualChunks(id) {
  if (id.includes('node_modules')) {
    return id.split('node_modules/')[1].split('/')[0]   // one chunk per package
  }
}

// BAD: Not externalizing peer deps in library mode — causes duplicate runtime errors
// build.lib without rolldownOptions.external

// BAD: Using deprecated esbuild minifier
build: { minify: 'esbuild' }                  // use 'oxc' (default) or 'terser'

// BAD: Mutating import.meta.hot.data by reassignment
import.meta.hot.data = { count: 0 }           // WRONG: must mutate properties, not reassign
import.meta.hot.data.count = 0                 // CORRECT
```

**프로세스 안티 패턴:**

- **`vite preview`는 프로덕션 서버가 아님** — 빌드된 번들의 스모크 테스트입니다. `dist/`를 실제 정적 호스트(NGINX, Cloudflare Pages, Vercel static) 또는 멀티 스테이지 Dockerfile에 배포하십시오.
- **`vite build`가 타입 체크를 한다고 기대하기** — 트랜스파일만 합니다. 타입 에러가 프로덕션에 그대로 배포됩니다. `vite-plugin-checker`를 추가하거나 CI에서 `tsc --noEmit`을 실행하십시오.
- **기본으로 `@vitejs/plugin-legacy` 배포** — 번들을 ~40% 부풀리고, 소스맵 번들 분석기를 망가뜨리며, 현대 브라우저 사용자 95%+에는 불필요합니다. 가정이 아닌 실제 분석에 따라 적용하십시오.
- **`tsconfig.json` paths를 중복하는 30개 이상의 `resolve.alias` 수동 작성** — 대신 `vite-tsconfig-paths`를 사용하십시오. Excalidraw와 PostHog에서 발견된 패턴; 새 프로젝트에서는 피하십시오.
- **의존성 변경 후 오래된 `node_modules/.vite` 방치** — 사전 번들 캐시가 유령 에러를 유발합니다. 브랜치 전환 또는 의존성 패치 후에 제거하십시오.

## 빠른 참조

| 패턴 | 사용 시점 |
|---------|-------------|
| `defineConfig` | 항상 — 타입 추론 제공 |
| `loadEnv(mode, root, ['VITE_'])` | 설정에서 환경 변수 접근 (명시적 접두사) |
| `vite-plugin-checker` | 모든 TypeScript 앱 (타입 체크 공백 채우기) |
| `vite-tsconfig-paths` | 수동 `resolve.alias` 대신 |
| `optimizeDeps.include` | 상호 운용 이슈를 유발하는 CJS 의존성 |
| `server.proxy` | 개발 중 API 요청을 백엔드로 라우팅 |
| `server.host: true` | Docker, 컨테이너, 원격 접근 |
| `server.warmup.clientFiles` | 핫 경로 라우트 사전 변환 |
| `build.lib` + `external` | npm 패키지 배포 |
| `manualChunks` (object) | 벤더 번들 분할 |
| `vite --profile` | 느린 개발 서버 디버깅 |
| `vite build && vite preview` | 로컬에서 프로덕션 번들 스모크 테스트 (프로덕션 서버 아님) |

## 관련 스킬

- `frontend-patterns` — React 컴포넌트 패턴
- `docker-patterns` — Vite가 포함된 컨테이너화된 개발
- `nextjs-turbopack` — Next.js용 대체 번들러
