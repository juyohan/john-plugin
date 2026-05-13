---
name: setup
description: 새 프로젝트를 초기화합니다. 스택을 자동 감지하고, 불확실한 항목만 질문한 뒤, Claude가 작업에 필요한 컨텍스트 파일을 생성합니다.
argument-hint: "[선택 사항: 프로젝트 이름 또는 스택 힌트]"
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.

# genie:setup — 프로젝트 초기화

완전히 빈 프로젝트(아무것도 없음)에서도 동작합니다. 프로젝트 파일을 스캔하여 스택을 감지하고, 판단하기 어려운 항목만 질문한 뒤, Claude가 이 프로젝트에서 작업할 때 참조할 문서 4개를 생성합니다.

**생성 파일:**
- `CLAUDE.md` — 프로젝트 이름 + @docs/ 참조
- `docs/conventions.md` — 네이밍 규칙, 코드 스타일, 선호 패턴
- `docs/architecture.md` — 디렉토리 구조, 레이어 구성, 설계 결정
- `docs/setup.md` — 실행/테스트/빌드 방법

---

## 상호작용 방식

사용자에게 질문할 때 `AskUserQuestion` 도구를 사용하십시오 (스키마가 로드되지 않은 경우 `ToolSearch`로 `select:AskUserQuestion` 먼저 호출). 도구가 없거나 오류 발생 시에만 채팅 폴백. **질문을 건너뛰지 마십시오.**

한 번에 하나의 질문만 던집니다.

---

## Phase 1 — 스택 감지 (U2)

프로젝트 루트에서 다음 파일들을 스캔하여 스택을 감지합니다.

**스캔 신호 우선순위:**

| 신호 파일 | 감지 결과 |
|-----------|----------|
| `pom.xml` | Java + Maven |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin + Gradle |
| `package.json` | Node.js (프레임워크는 추가 확인) |
| `next.config.js` / `next.config.ts` | Next.js |
| `nuxt.config.ts` | Nuxt.js |
| `vite.config.ts` | Vite (React/Vue 추가 확인) |
| `pyproject.toml` / `requirements.txt` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `*.sln` / `*.csproj` | C# / .NET |

**추가 감지:**
- `src/main/java/` 존재 → Spring Boot 레이어 구조 확인
- `src/main/resources/application.yml` 또는 `application.properties` → Spring Boot 확정
- `package.json`의 `dependencies` 필드에서 프레임워크 확인 (react, vue, express 등)
- 루트에 `backend/` + `frontend/` 디렉토리 모두 존재 + 각각 빌드 파일 → 모노레포

**감지 결과 출력 예시:**
```
스택 감지 결과:
- 언어: TypeScript
- 프레임워크: Next.js 14
- 패키지 매니저: pnpm
- 테스트: Jest + Testing Library
- 구조: App Router (app/)
```

감지 결과를 사용자에게 출력하고 Phase 2로 진행합니다.

---

## Phase 2 — 충돌 감지 및 확인 (U3)

생성 대상 파일(`CLAUDE.md`, `docs/conventions.md`, `docs/architecture.md`, `docs/setup.md`) 중 이미 존재하는 파일이 있는지 확인합니다.

**존재하는 파일이 없으면:** 질문 없이 Phase 3으로 바로 진행.

**1개 이상 존재하면:** `AskUserQuestion`으로 다음 질문을 던집니다:

```
다음 파일이 이미 존재합니다: [파일 목록]
어떻게 처리할까요?
A. 덮어쓰기 — 기존 파일을 새 내용으로 교체
B. 병합 — 기존 내용을 보존하고 새로 감지된 내용을 추가
```

- **덮어쓰기**: 기존 파일 삭제 후 새로 생성
- **병합**: 기존 내용 아래에 `---` 구분선 후 새 섹션 추가. 동일한 섹션 헤더(`##`)가 이미 있으면 해당 섹션 아래에 내용 병합. `@docs/conventions.md` 등 이미 존재하는 `@docs/` 참조 라인은 중복 추가하지 않음

---

## Phase 3 — 불확실 항목 질문 (U4)

Phase 1 스캔으로 확정되지 않은 항목에 대해서만 질문합니다. **확실히 감지된 항목은 질문하지 않습니다.**

**스택별 자동 결정 (질문 불필요):**

| 감지된 스택 | 자동 결정 항목 |
|------------|--------------|
| Java / Spring Boot | 네이밍: camelCase/PascalCase, 구조: 레이어별(Controller→Service→Repository) |
| Kotlin / Spring Boot | 네이밍: camelCase/PascalCase, 구조: 레이어별 |
| TypeScript / JavaScript | 네이밍: camelCase/PascalCase |
| Python | 네이밍: snake_case/PascalCase (PEP 8) |
| Go | 네이밍: camelCase/PascalCase (gofmt 기준) |
| Rust | 네이밍: snake_case/PascalCase |

**ESLint / Prettier / .editorconfig 파일 존재 시:** 해당 설정을 우선 적용하고 네이밍/스타일 질문은 건너뜁니다.

**질문 발생 조건 및 예시 (자동 결정 불가한 경우에만):**

| 조건 | 질문 예시 |
|------|----------|
| 언어/프레임워크 미감지 (완전 빈 디렉토리) | "어떤 언어/프레임워크를 사용할 프로젝트인가요?" |
| 패키지 구조 불명확 (스캔으로 레이어/기능 구분 불가) | "패키지 구조 선호도를 선택해주세요: 기능별(feature) / 레이어별(layer)" |
| 테스트 전략 불명확 (테스트 프레임워크 미감지) | "테스트 전략을 선택해주세요: 단위 테스트 중심 / 통합 테스트 중심 / 둘 다" |
| 프로젝트 이름 불명확 (`$ARGUMENTS`에 없고 package.json 등에도 없는 경우) | "프로젝트 이름이 무엇인가요?" |

수집된 답변은 Phase 4 문서 생성에 반영합니다.

---

## Phase 4 — 문서 생성 (U5)

Phase 1–3에서 수집한 모든 정보를 바탕으로 4개 파일을 생성합니다.

### `CLAUDE.md`

```markdown
# {프로젝트 이름}

## 코드 컨벤션 (docs/conventions.md)
네이밍 규칙, 코드 스타일, 선호 패턴
@docs/conventions.md

## 아키텍처 (docs/architecture.md)
디렉토리 구조, 레이어 구성, 주요 설계 결정
@docs/architecture.md

## 개발 환경 (docs/setup.md)
실행, 테스트, 빌드 방법
@docs/setup.md
```

### `docs/conventions.md`

감지된 언어/프레임워크 기반으로 작성. 포함 내용:

- **네이밍 규칙**: 변수, 함수, 클래스, 파일, 디렉토리 네이밍 컨벤션
- **코드 스타일**: 들여쓰기(스페이스/탭, 크기), 줄 길이 권장값, 따옴표 스타일 등
- **파일/디렉토리 구조**: 어디에 무엇을 넣는지 패턴
- **Import 순서**: 외부 패키지 → 내부 모듈 → 상대 경로 등
- **사용자 답변 반영**: Phase 3에서 수집한 팀 선호 패턴

언어별 기본 컨벤션 기준:
- Java/Kotlin: Google Java Style Guide 기반
- TypeScript/JavaScript: Airbnb 스타일 기반 (ESLint 설정 존재 시 우선)
- Python: PEP 8 기반
- Go: gofmt 기준

### `docs/architecture.md`

실제 스캔 결과를 반영하여 작성. 포함 내용:

- **프로젝트 구조**: 실제 디렉토리 트리 (주요 디렉토리만)
- **레이어 구성**: 감지된 스택 기반 (예: Controller → Service → Repository)
- **주요 설계 결정**: 모노레포 여부, 멀티 모듈 구조, 주요 패턴 등
- **의존성**: 주요 외부 라이브러리 (빌드 파일에서 추출)

모노레포 감지 시 서브 프로젝트별로 레이어를 분리하여 기록합니다.

### `docs/setup.md`

감지된 패키지 매니저/빌드 도구 기반으로 작성. 포함 내용:

- **사전 요구사항**: 필요한 런타임, 도구 버전
- **설치**: 의존성 설치 명령
- **실행**: 로컬 개발 서버 실행 명령
- **테스트**: 테스트 실행 명령
- **빌드**: 프로덕션 빌드 명령
- **환경 변수**: `.env.example` 존재 시 키 목록 및 설명

---

## 완료 출력

모든 파일 생성 후 다음을 출력합니다:

```
✅ genie:setup 완료

생성된 파일:
- CLAUDE.md
- docs/conventions.md
- docs/architecture.md
- docs/setup.md

Claude는 이제 이 프로젝트의 컨텍스트를 세션 시작 시 자동으로 로드합니다.

다음 단계: /genie:brainstorm — 첫 번째 기능 개발을 시작하세요.
```

---

## 스코프 경계

**포함:**
- 프로젝트 로컬 파일 생성만 (`CLAUDE.md` + `docs/` 3개)
- 자동 스캔 + 불확실 항목만 질문

**제외 (건드리지 않음):**
- `~/.claude/rules/` 글로벌 설정
- `docs/brainstorms/`, `docs/plans/` 등 워크플로우 산출물
- `CONTRIBUTING.md` (사람용 기여 가이드)
- 기존 소스 코드
