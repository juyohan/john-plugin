---
name: nuxt
description: Nuxt 4 앱 패턴 — 하이드레이션(hydration) 안전성, 성능, 라우트 규칙, 지연 로딩, useFetch 및 useAsyncData를 이용한 SSR 안전 데이터 페칭.
origin: ECC
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# Nuxt 4 패턴

SSR(서버 사이드 렌더링), 하이브리드 렌더링, 라우트 규칙, 페이지 수준 데이터 페칭이 포함된 Nuxt 4 앱을 구축하거나 디버깅할 때 사용합니다.

## 활성화 시점

- 서버 HTML과 클라이언트 상태 간 하이드레이션(hydration) 불일치 발생 시
- 프리렌더(prerender), SWR, ISR, 클라이언트 전용 섹션 등 라우트 수준 렌더링 결정 시
- 지연 로딩(lazy loading), 지연 하이드레이션(lazy hydration), 페이로드 크기 등 성능 작업 시
- `useFetch`, `useAsyncData`, `$fetch`를 이용한 페이지 또는 컴포넌트 데이터 페칭 시
- 라우트 파라미터, 미들웨어, SSR/클라이언트 차이에 관련된 Nuxt 라우팅 이슈 발생 시

## 하이드레이션 안전성

- 첫 번째 렌더를 결정론적으로 유지하십시오. `Date.now()`, `Math.random()`, 브라우저 전용 API, 또는 스토리지 읽기를 SSR 렌더링 템플릿 상태에 직접 넣지 마십시오.
- 서버가 동일한 마크업을 생성할 수 없는 경우, 브라우저 전용 로직을 `onMounted()`, `import.meta.client`, `ClientOnly`, 또는 `.client.vue` 컴포넌트 뒤로 이동하십시오.
- `vue-router`의 것이 아닌 Nuxt의 `useRoute()` 컴포저블을 사용하십시오.
- SSR 렌더링 마크업을 구동하는 데 `route.fullPath`를 사용하지 마십시오. URL 프래그먼트는 클라이언트 전용이므로 하이드레이션 불일치를 유발할 수 있습니다.
- `ssr: false`는 진정으로 브라우저 전용 영역을 위한 탈출구로 취급하십시오. 불일치에 대한 기본 해결책이 아닙니다.

## 데이터 페칭

- 페이지와 컴포넌트에서 SSR 안전 API 읽기에는 `await useFetch()`를 사용하십시오. 서버에서 페칭한 데이터를 Nuxt 페이로드에 전달하여 하이드레이션 시 두 번째 페칭을 방지합니다.
- 페처(fetcher)가 단순한 `$fetch()` 호출이 아니거나, 커스텀 키가 필요하거나, 여러 비동기 소스를 조합할 때는 `useAsyncData()`를 사용하십시오.
- 캐시 재사용과 예측 가능한 새로고침 동작을 위해 `useAsyncData()`에 안정적인 키를 제공하십시오.
- `useAsyncData()` 핸들러는 부작용(side-effect)이 없도록 유지하십시오. SSR과 하이드레이션 중에 실행될 수 있습니다.
- 사용자가 트리거하는 쓰기(write) 또는 클라이언트 전용 액션에는 `$fetch()`를 사용하십시오. SSR에서 하이드레이션되어야 하는 최상위 페이지 데이터에는 사용하지 마십시오.
- 내비게이션을 차단해서는 안 되는 비중요(non-critical) 데이터에는 `lazy: true`, `useLazyFetch()`, 또는 `useLazyAsyncData()`를 사용하십시오. UI에서 `status === 'pending'`을 처리하십시오.
- SEO나 첫 번째 렌더에 필요하지 않은 데이터에만 `server: false`를 사용하십시오.
- `pick`으로 페이로드 크기를 줄이고, 깊은 반응성이 불필요한 경우 더 얕은 페이로드를 선호하십시오.

```ts
const route = useRoute()

const { data: article, status, error, refresh } = await useAsyncData(
  () => `article:${route.params.slug}`,
  () => $fetch(`/api/articles/${route.params.slug}`),
)

const { data: comments } = await useFetch(`/api/articles/${route.params.slug}/comments`, {
  lazy: true,
  server: false,
})
```

## 라우트 규칙

렌더링 및 캐싱 전략에는 `nuxt.config.ts`의 `routeRules`를 사용하십시오:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/products/**': { swr: 3600 },
    '/blog/**': { isr: true },
    '/admin/**': { ssr: false },
    '/api/**': { cache: { maxAge: 60 * 60 } },
  },
})
```

- `prerender`: 빌드 시 정적 HTML 생성
- `swr`: 캐시된 콘텐츠를 제공하고 백그라운드에서 재검증
- `isr`: 지원되는 플랫폼에서 점진적 정적 재생성(incremental static regeneration)
- `ssr: false`: 클라이언트 렌더링 라우트
- `cache` 또는 `redirect`: Nitro 수준 응답 동작

전역 설정이 아닌 라우트 그룹별로 라우트 규칙을 선택하십시오. 마케팅 페이지, 카탈로그, 대시보드, API는 일반적으로 서로 다른 전략이 필요합니다.

## 지연 로딩과 성능

- Nuxt는 이미 라우트별로 코드를 분할합니다. 컴포넌트 분할을 마이크로 최적화하기 전에 라우트 경계가 의미 있는지 확인하십시오.
- 비중요(non-critical) 컴포넌트를 동적으로 임포트하려면 `Lazy` 접두사를 사용하십시오.
- UI가 실제로 필요할 때까지 청크가 로드되지 않도록 `v-if`로 지연 컴포넌트를 조건부 렌더링하십시오.
- 화면 아래쪽 또는 비중요 인터랙티브 UI에는 지연 하이드레이션(lazy hydration)을 사용하십시오.

```vue
<template>
  <LazyRecommendations v-if="showRecommendations" />
  <LazyProductGallery hydrate-on-visible />
</template>
```

- 커스텀 전략이 필요한 경우 `defineLazyHydrationComponent()`에 가시성(visibility) 또는 유휴(idle) 전략을 사용하십시오.
- Nuxt 지연 하이드레이션은 싱글 파일 컴포넌트(Single-File Components)에서 작동합니다. 지연 하이드레이션된 컴포넌트에 새 프롭스를 전달하면 즉시 하이드레이션이 트리거됩니다.
- 내부 내비게이션에는 `NuxtLink`를 사용하여 Nuxt가 라우트 컴포넌트와 생성된 페이로드를 프리페치(prefetch)할 수 있도록 하십시오.

## 리뷰 체크리스트

- 첫 번째 SSR 렌더와 하이드레이션된 클라이언트 렌더가 동일한 마크업을 생성하는가
- 페이지 데이터가 최상위 `$fetch`가 아닌 `useFetch` 또는 `useAsyncData`를 사용하는가
- 비중요 데이터가 지연 로딩되고 명시적인 로딩 UI가 있는가
- 라우트 규칙이 페이지의 SEO 및 신선도(freshness) 요구사항과 일치하는가
- 무거운 인터랙티브 아일랜드(island)가 지연 로딩되거나 지연 하이드레이션되는가
