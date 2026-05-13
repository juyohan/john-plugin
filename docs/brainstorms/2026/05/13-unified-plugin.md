---
date: 2026-05-13
topic: unified-plugin
---

# Unified Plugin Requirements

---

## Product Statement

CE 워크플로우를 뼈대로 삼아 ECC·CE의 스킬·에이전트·룰·훅 인프라를 통합하고,
팀원이 "지금 어떤 도구를 써야 하는지" 자연스럽게 안내받을 수 있는
단일 Claude Code 플러그인. 소규모 팀이 세팅 없이 바로 쓰고, 필요한 부분은 직접 커스터마이즈할 수 있다.

현재 보유 자산: **34 skills / 29 agents / 13 rules**

---

## Actors

| ID | Actor | Description |
|----|-------|-------------|
| A-1 | 팀 개발자 | 플러그인을 설치하고 매일 CE 워크플로우로 작업하는 사람 |
| A-2 | 팀 리드 | 팀 전체 세팅과 커스터마이즈 설정을 관리하는 사람 |
| A-3 | 신규 팀원 | CE·ECC 둘 다 처음인 사람, 온보딩 경험이 핵심 |

---

## Requirements

### R-1: CE 워크플로우 진입점 유지
전체 CE 플로우가 플러그인의 기본 진입점이어야 한다.

**핵심 워크플로우 스킬 (현재 보유):**
```
ce-ideate → ce-brainstorm → ce-plan → tdd-guide → ce-work → ce-code-review → ce-commit → ce-compound
```

**보조 스킬:**
- `ce-strategy` — 브레인스톰 전 전략 수립이 필요할 때
- `ce-debug` — 구현 중 디버깅
- `ce-optimize` — 성능 최적화
- `ce-proof` — 결과물 검증
- `ce-doc-review` — 문서 품질 리뷰
- `ce-resolve-pr-feedback` — PR 피드백 대응
- `ce-simplify-code` — 코드 단순화
- `ce-worktree` / `ce-clean-gone-branches` — git 브랜치 관리
- `ce-frontend-design` — 프론트엔드 디자인 작업

### R-2: ECC 코드 리뷰 도구를 CE 워크플로우에 통합
CE가 "언제 리뷰할지"를 결정하고, ECC·CE 에이전트가 "어떻게 리뷰할지"를 실행한다.

**ECC 범용 리뷰어 (현재 보유):**
| 에이전트 | 역할 |
|----------|------|
| `code-reviewer` | 일반 코드 품질·패턴·베스트 프랙티스 |
| `security-reviewer` | 보안 취약점·OWASP Top 10 (인증·API·암호화 코드 필수) |
| `typescript-reviewer` | TypeScript/JS/Vue/Nuxt/Node |
| `python-reviewer` | Python |
| `go-reviewer` | Go |
| `java-reviewer` | Java/Spring Boot |
| `kotlin-reviewer` | Kotlin/Android |
| `swift-reviewer` | Swift/iOS |

**CE 고유 리뷰 에이전트 (현재 보유):**
| 에이전트 | 역할 |
|----------|------|
| `ce-adversarial-reviewer` | 비판적 관점으로 약점 탐색 |
| `ce-correctness-reviewer` | 로직 정확성 검증 |
| `ce-coherence-reviewer` | 코드·아키텍처 일관성 |
| `ce-feasibility-reviewer` | 구현 실현가능성 |
| `ce-scope-guardian-reviewer` | 요구사항 범위 준수 여부 |
| `ce-maintainability-reviewer` | 유지보수성 |
| `ce-testing-reviewer` | 테스트 품질·커버리지 관점 |

**심각도 체계 (ECC 기준):**
- `CRITICAL` — 머지 차단, 즉시 수정
- `HIGH` — 머지 전 수정 권장
- `MEDIUM` — 검토 후 판단
- `LOW` — 선택적 개선

**리뷰 체크리스트 기준:** `rules/common/code-review.md` (커버리지 80%+, 함수 50줄 이하, 하드코딩 비밀 없음 등)

### R-3: 언어·프레임워크별 Rules 통합
`rules/` 디렉토리에 13개 언어/도메인 룰이 제공된다.

**현재 보유 Rules:**
| 디렉토리 | 커버 범위 |
|----------|-----------|
| `common/` | 코딩 스타일, 테스트, 보안, git, 성능, 패턴, 훅 (언어 무관) |
| `typescript/` | TypeScript/JS 관용구, 보안, 훅, 패턴 |
| `web/` | 프론트엔드 성능, 디자인 품질, 접근성, 보안, 훅 |
| `python/` | PEP 8, 타입 힌트, 보안 |
| `golang/` | Go 관용구, 동시성, 에러 처리 |
| `java/` | Spring Boot, JPA, 보안 |
| `kotlin/` | Coroutine, Compose, 클린 아키텍처 |
| `swift/` | Swift Concurrency, ARC, 프로토콜 |
| `angular/` | Angular 패턴·DI·테스트 |
| `csharp/` | .NET async, nullable, 보안 |
| `dart/` | Flutter/Dart 패턴 |
| `php/` | PHP/Laravel 패턴·보안 |
| `rust/` | 소유권, lifetimes, 에러 처리 |

팀 리드는 필요한 언어 룰만 활성화하여 팀 전체에 공유할 수 있어야 한다.

### R-4: ECC 훅 인프라 통합
GateGuard, quality-gate, observe-runner 등 ECC의 훅 자동화가 기본으로 포함되어야 한다.
훅 프로파일(minimal / standard / strict) 선택이 가능해야 한다.

- `standard` (기본): GateGuard + observe-runner
- `strict`: 모든 훅 활성화 (commit quality, build verification 포함)
- `minimal`: GateGuard만

### R-5: 워크플로우 안내 레이어
팀원이 막혔을 때 "지금 상황에서 어떤 스킬/커맨드를 써야 하는지"를 안내받을 수 있는 진입점.
`ce-ideate` 또는 `/ce-help`가 이 역할을 수행한다.

### R-6: 커스터마이즈 레이어
팀원이 코드를 직접 수정하지 않고도 아래 항목을 오버라이드할 수 있어야 한다:
- 활성화된 훅 목록 (환경 변수 또는 config 파일)
- 사용하는 룰 세트
- 특정 스킬의 기본 동작

### R-7: 단일 설치 경험
`git clone` + `install.sh` 하나로 모든 스킬·에이전트·룰·훅이 세팅되는 경험.
ECC와 john-plugin을 따로 설치·관리할 필요가 없어야 한다.

### R-8: 프로젝트 감지 기반 스킬/에이전트/룰 자동 추천
프로젝트 루트의 파일을 감지하여 적합한 도구를 자동 제안한다.

**감지 → 추천 매핑:**
| 감지 파일 | 언어/프레임워크 | 추천 Agent | 추천 Rules | 추천 Skills |
|-----------|-----------------|------------|------------|-------------|
| `package.json` + `tsconfig.json` | TypeScript/Node | `typescript-reviewer` | `typescript`, `web` | `frontend-patterns`, `vite-patterns` |
| `nuxt.config.*` / `vue.config.*` | Vue/Nuxt | `typescript-reviewer` | `typescript`, `web` | `nuxt4-patterns`, `ui-to-vue` |
| `requirements.txt` / `pyproject.toml` | Python | `python-reviewer` | `python` | `coding-standards` |
| `go.mod` | Go | `go-reviewer`, `go-build-resolver` | `golang` | `backend-patterns` |
| `pom.xml` / `build.gradle` | Java/Spring | `java-reviewer`, `java-build-resolver` | `java` | `springboot-patterns`, `jpa-patterns` |
| `build.gradle.kts` | Kotlin | `kotlin-reviewer`, `kotlin-build-resolver` | `kotlin` | — |
| `*.xcodeproj` / `Package.swift` | Swift/iOS | `swift-reviewer`, `swift-build-resolver` | `swift` | — |
| `Cargo.toml` | Rust | — | `rust` | — |
| `composer.json` | PHP | — | `php` | — |

빌드 실패 시 → 언어별 `*-build-resolver` 또는 범용 `build-error-resolver` 자동 제안.

### R-9: TDD 우선 개발 워크플로우 통합
`ce-plan` 완료 후, 구현 전에 `tdd-guide` 에이전트를 통해
계획 기반의 실패 테스트를 먼저 작성하고 검토한 뒤 `ce-work`로 구현에 진입해야 한다.

- 순서: `ce-plan` → `tdd-guide` (RED) → `ce-work` (GREEN → IMPROVE)
- `ce-plan`이 정의한 파일·인터페이스를 기준으로 테스트가 명세 역할을 수행
- `tdd-guide`가 커버리지 기준(80%+)과 AAA 패턴을 안내
- 기존 테스트 없는 코드 수정 시에도 `tdd-guide`가 먼저 제안
- 테스트 리뷰는 `ce-testing-reviewer`가 담당

### R-10: 단계별 문서 히스토리 관리
CE 워크플로우의 각 단계를 지날 때마다 해당 단계의 산출물을 `docs/` 아래에 기록해야 한다.
같은 작업이라면 `<제목>`을 단계 간 통일하여 전체 흐름을 추적할 수 있어야 한다.

`ce-ideate → ce-strategy → ce-brainstorm`은 하나의 **정의(Define) 페이즈**이므로
ideate·strategy 노트는 brainstorm과 같은 폴더에 suffix로 보관한다.

| 단계 | 스킬 | 문서 경로 |
|------|------|-----------|
| 아이디어 탐색 (선택) | `ce-ideate` | `docs/brainstorms/YYYY/MM/DD-<제목>-ideation.md` |
| 전략 정렬 (선택) | `ce-strategy` | `docs/brainstorms/YYYY/MM/DD-<제목>-strategy.md` |
| 요구사항 정의 | `ce-brainstorm` | `docs/brainstorms/YYYY/MM/DD-<제목>.md` ← 메인 산출물 |
| 구현 계획 | `ce-plan` | `docs/plans/YYYY/MM/DD-<제목>.md` |
| TDD 명세 | `tdd-guide` | `docs/tests/YYYY/MM/DD-<제목>.md` |
| 구현·디버깅 | `ce-work`, `ce-debug`, `ce-optimize` | `docs/work/YYYY/MM/DD-<제목>.md` |
| 코드 리뷰 | `ce-code-review` | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| 지식 자산화 | `ce-compound` | `docs/compounds/YYYY/MM/DD-<제목>.md` |

- `ce-commit` 등 git 단계는 커밋 자체가 산출물이므로 별도 문서 불필요
- `docs/work/`에는 구현 중 의사결정, 블로커, 변경 이유 등 커밋 메시지에 담기지 않는 내용 기록
- 예: `unified-plugin` 작업의 전체 흐름:
  - `docs/brainstorms/2026/05/13-unified-plugin-ideation.md` (탐색 노트)
  - `docs/brainstorms/2026/05/13-unified-plugin.md` (요구사항 — 메인)
  - `docs/plans/2026/05/13-unified-plugin.md` (구현 계획)
  - `docs/tests/2026/05/13-unified-plugin.md` (TDD 명세)
  - `docs/work/2026/05/13-unified-plugin.md` (구현 노트)
  - `docs/reviews/2026/05/13-unified-plugin.md` (리뷰 결과)
  - `docs/compounds/2026/05/13-unified-plugin.md` (레슨런)

---

## Key Flows

### F-1: 신규 팀원 온보딩
```
설치(clone + install.sh)
  → ce-ideate ("지금 어떤 작업을 하려고 해?" 안내)
  → R-8 프로젝트 감지 → 언어별 도구 자동 추천
  → 적절한 CE 플로우 진입점 추천
```

### F-2: 일반 개발 워크플로우
```
ce-ideate  (탐색 — 어떤 방향이 가치 있는지)
  └─ ce-strategy (필요 시 — 전략 정렬)
  └─ ce-brainstorm (요구사항 정의 — R/A/F/AE 문서 생성)

ce-plan  (구현 계획 — 파일·인터페이스 수준 확정)
  └─ [R-8] 프로젝트 감지 → 언어별 reviewer + rules + skills 자동 제안

tdd-guide  (실패 테스트 먼저 작성 — RED)
  └─ ce-testing-reviewer (테스트 품질 검증)

ce-work  (최소 구현으로 테스트 통과 — GREEN → IMPROVE)
  └─ ce-debug (막히면)
  └─ ce-optimize (성능 이슈)

ce-code-review  (리뷰 오케스트레이션)
  └─ code-reviewer (일반 품질)
  └─ [언어별 reviewer]  (R-8 자동 선택)
  └─ security-reviewer  (보안 관련 코드)
  └─ ce-scope-guardian-reviewer (범위 준수)
  └─ ce-correctness-reviewer / ce-coherence-reviewer (필요 시)

ce-commit / ce-commit-push-pr  (git 워크플로우)

ce-compound  (지식 자산화 — 레슨런 정리)
```

### F-3: 팀 리드 커스터마이즈
```
config 파일 수정
  → 훅 프로파일 선택 (minimal / standard / strict)
  → 필요한 언어별 rules 활성화
  → 팀 전체에 공유
```

### F-4: 코드 리뷰 플로우
```
ce-code-review 진입
  → code-reviewer (코드 품질·패턴)
  → [언어별 reviewer] (R-8 기반 자동 선택)
  → security-reviewer (인증·입력·API 코드 감지 시)
  → ce-scope-guardian-reviewer (요구사항 범위 이탈 여부)
  → ce-maintainability-reviewer / ce-coherence-reviewer (필요 시)
  → CRITICAL 발견 → 머지 차단, 수정 후 재리뷰
  → ce-doc-review (문서 함께 변경된 경우)
```

### F-5: 디버깅·최적화 플로우
```
ce-debug (디버깅 진입)
  └─ build-error-resolver / [언어별 resolver] (빌드 실패 시)
ce-optimize (성능 이슈)
  └─ performance-optimizer (ECC)
  └─ refactor-cleaner (데드코드 제거)
  └─ code-simplifier (복잡도 축소)
```

---

## Acceptance Examples

| ID | Scenario | Expected |
|----|----------|----------|
| AE-1 | 신규 팀원이 `ce-ideate`를 실행한다 | 현재 상황에 맞는 CE 플로우 진입점과 프로젝트 감지 결과를 안내받는다 |
| AE-2 | 팀 리드가 훅 프로파일을 `strict`로 설정한다 | GateGuard, commit-quality 등 모든 훅이 활성화된다 |
| AE-3 | 개발자가 `ce-plan` 후 `tdd-guide`를 실행한다 | 계획 기반 실패 테스트 파일이 먼저 작성되고, `ce-work`로 넘어간다 |
| AE-4 | Vue/Nuxt 프로젝트에서 플러그인을 처음 실행한다 | `nuxt.config` 감지 후 `typescript-reviewer`, `nuxt4-patterns`, `web` rules 사용이 자동 제안된다 |
| AE-5 | 팀원이 훅을 비활성화하고 싶다 | 코드 수정 없이 config/env 파일만 수정한다 |
| AE-6 | Python 프로젝트에서 코드를 작성했다 | `python-reviewer`가 자동 선택되어 PEP8·타입 힌트·보안 룰 기준으로 리뷰한다 |
| AE-7 | `ce-work` 중 빌드가 실패한다 | 프로젝트 감지 결과에 따라 `go-build-resolver` 등 언어별 resolver가 자동 제안된다 |
| AE-8 | 테스트가 없는 기존 코드를 수정하려 한다 | `tdd-guide`가 먼저 해당 코드의 테스트 작성을 제안한다 |
| AE-9 | `ce-code-review` 후 CRITICAL 이슈가 발견된다 | 머지가 차단되고, 수정 후 재리뷰 절차를 안내받는다 |
| AE-10 | PR 피드백을 받았다 | `ce-resolve-pr-feedback`으로 피드백을 정리하고 대응 계획을 수립한다 |

---

## Scope Boundaries

**포함 (현재 보유)**
- CE 워크플로우 스킬 전체: `ce-ideate`, `ce-brainstorm`, `ce-strategy`, `ce-plan`, `ce-work`, `ce-code-review`, `ce-commit`, `ce-commit-push-pr`, `ce-compound` 등 (34개)
- ECC 리뷰어 에이전트: 언어별 8종 + 범용 `code-reviewer` + `security-reviewer`
- CE 고유 리뷰 에이전트: `ce-adversarial`, `ce-correctness`, `ce-coherence`, `ce-feasibility`, `ce-scope-guardian`, `ce-maintainability`, `ce-testing` (7종)
- 빌드 에러 리졸버: `build-error-resolver` + 언어별 5종
- 품질 도구: `refactor-cleaner`, `performance-optimizer`, `code-simplifier`, `doc-updater`
- Rules: 13개 언어/도메인 (`common` 포함)
- ECC 훅 인프라 (GateGuard, observe-runner 등)
- TDD 우선 워크플로우 (`tdd-guide` 통합)
- 프로젝트 감지 기반 자동 추천 (R-8)

**포함하지 않음 (이 버전)**
- 공개 배포용 마켓플레이스 등록
- GUI 설정 인터페이스
- ECC 원본 레포와의 자동 동기화
- R-8 자동 감지 로직 구현 (현재는 수동 안내, 향후 구현 대상)

---

## Assumptions

- `john-plugin` 레포를 기반으로 점진적으로 작업
- "커스터마이즈"는 코드 직접 수정이 아닌 설정 파일/환경 변수를 의미
- R-8 프로젝트 감지는 현재 수동 안내 방식이며, 자동화는 다음 단계
- 팀 규모는 소수 (10명 이하)
- 보유 자산 기준일: 2026-05-13
