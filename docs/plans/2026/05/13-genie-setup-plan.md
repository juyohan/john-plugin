# genie:setup — 구현 플랜

**날짜:** 2026-05-13
**상태:** 플랜 완료 → 빌드 대기
**Origin:** `docs/brainstorms/2026/05/13-genie-setup.md`

---

## 결정 사항 (Decisions)

| # | 결정 | 근거 |
|---|------|------|
| D1 | 스킬 로직은 `skills/setup/SKILL.md` 단일 파일에 작성 | 기존 모든 스킬이 동일한 패턴을 따름 |
| D2 | 커맨드는 `commands/setup.md`로 등록 | 기존 커맨드 파일 패턴과 일치 |
| D3 | 스캔 신호: `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.sln`, 디렉토리 구조 | 주요 생태계 빌드 파일로 스택 감지 |
| D4 | 불확실 항목 질문은 `AskUserQuestion` 도구 사용 (없으면 채팅 폴백) | 기존 스킬 상호작용 방식과 일치 |
| D5 | 생성 파일 4개: `CLAUDE.md`, `docs/conventions.md`, `docs/architecture.md`, `docs/setup.md` | R3–R6 요구사항 |
| D6 | CLAUDE.md는 프로젝트 이름 + 섹션 설명 + `@docs/` 참조 3줄만 포함 | R9·R10: 인라인 요약 없음, 워크플로우 산출물 참조 제외 |
| D7 | 기존 파일 감지 시 덮어쓰기/병합 여부를 사용자에게 확인 | R11 |

---

## 스코프 경계

**포함:**
- `skills/setup/SKILL.md` 생성 (스킬 로직 전체)
- `commands/setup.md` 생성 (커맨드 등록)
- 스킬이 생성하는 4개 파일의 템플릿 설계 (CLAUDE.md, conventions.md, architecture.md, setup.md)

**제외 (R7):**
- `~/.claude/rules/` 글로벌 수정
- 기존 스킬 수정
- CONTRIBUTING.md 생성

---

## 구현 단위 (U-IDs)

### U1. `commands/setup.md` — 커맨드 파일

**Touches:** `commands/setup.md` (신규)
**Origin:** R3–R6, F1

커맨드 파일은 스킬을 `/genie:setup`으로 노출하는 얇은 래퍼.

**완료 기준:**
- `commands/setup.md` 파일 존재
- frontmatter에 `description` 포함
- 스테이지 경계 메시지 포함
- `$ARGUMENTS` 전달 구조 포함
- `/genie:setup` 커맨드로 실행 가능

**테스트 시나리오:**
- Happy path: `/genie:setup` 실행 시 스킬이 로드됨
- Edge: 인자 없이 실행해도 스킬이 정상 동작 시작됨

---

### U2. `skills/setup/SKILL.md` — Phase 1: 스택 감지

**Touches:** `skills/setup/SKILL.md` (신규)
**Origin:** R1, F1
**Depends on:** U1

프로젝트 루트의 빌드 파일과 디렉토리 구조를 스캔하여 스택을 감지하는 로직.

**감지 대상:**
- 언어: Java, Kotlin, TypeScript/JavaScript, Python, Go, Rust, C#
- 프레임워크: Spring Boot, Next.js, React, Vue/Nuxt, FastAPI, Gin 등
- 패키지 매니저: npm/yarn/pnpm, Maven/Gradle, pip/poetry, go mod
- 테스트 프레임워크: JUnit, Jest, pytest, go test 등
- 디렉토리 구조: src/, app/, lib/, test/, 모노레포 여부

**완료 기준:**
- 감지 결과를 사용자에게 출력 (예: "Spring Boot + JPA + Gradle 프로젝트 감지됨")
- 모노레포 감지 시 각 서브 프로젝트별로 분리 처리
- 완전히 빈 디렉토리는 "감지 불가" 상태로 처리

**테스트 시나리오 (Covers AE1, AE2, AE3, AE4):**
- Happy: `package.json` + `next.config.js` 존재 → Next.js 감지
- Happy: `pom.xml` + `@SpringBootApplication` 존재 → Spring Boot 감지
- Edge: `package.json`만 존재 (프레임워크 불명) → 프레임워크 질문 필요 상태로 전환
- Edge: 빈 디렉토리 → 언어/프레임워크 모두 질문 필요 상태로 전환 (Covers AE3)
- Edge: 루트에 `backend/` + `frontend/` 모두 존재 → 모노레포로 감지 (Covers AE4)

---

### U3. `skills/setup/SKILL.md` — Phase 2: 충돌 감지 및 확인

**Touches:** `skills/setup/SKILL.md` (U2와 동일 파일, 이어서 작성)
**Origin:** R11, F2

`CLAUDE.md` 또는 `docs/conventions.md` 등 생성 대상 파일이 이미 존재하는지 확인 후 처리 방식을 묻는 로직.

**완료 기준:**
- 생성 대상 파일 목록 존재 여부 체크
- 1개 이상 존재 시 "덮어쓰기 / 병합" 선택 질문 발생
- 덮어쓰기: 기존 파일 교체
- 병합: 기존 내용 + 새 감지 내용을 합쳐서 생성
- 아무것도 없으면 질문 없이 바로 진행

**테스트 시나리오:**
- Happy: 아무 파일도 없음 → 충돌 질문 없이 바로 Phase 3 진행
- Edge: `CLAUDE.md`만 존재 → 덮어쓰기/병합 확인
- Edge: 모든 파일 존재 → 덮어쓰기/병합 확인 (한 번만 질문)

---

### U4. `skills/setup/SKILL.md` — Phase 3: 불확실 항목 질문

**Touches:** `skills/setup/SKILL.md` (이어서)
**Origin:** R2, F3

스캔으로 알 수 없는 항목(팀 컨벤션, 선호 패턴 등)을 한 번에 하나씩 질문하는 로직.

**질문 항목 예시 (감지 실패 또는 추가 확인 필요 시에만):**
- 선호 언어/프레임워크 (완전 빈 프로젝트 시)
- 네이밍 컨벤션 (camelCase vs snake_case 등)
- 패키지 구조 선호도 (기능별 vs 레이어별)
- 테스트 전략 (단위 테스트 중심 vs 통합 테스트 중심)

**완료 기준:**
- `AskUserQuestion` 도구로 한 번에 하나씩 질문
- 도구 미지원 시 채팅 폴백
- 스캔으로 확실히 감지된 항목은 질문 건너뜀
- 수집된 답변은 문서 생성 단계(U5)로 전달

**테스트 시나리오 (Covers AE3):**
- Happy: 스캔으로 스택 완전 감지 → 질문 0개, 바로 생성
- Edge: 스택만 감지, 네이밍 불명 → 필요한 질문만 발생
- Edge: 완전 빈 디렉토리 → 언어 포함 필요 항목 전부 질문

---

### U5. `skills/setup/SKILL.md` — Phase 4: 문서 생성

**Touches:** `skills/setup/SKILL.md` (이어서)
**Origin:** R3–R10, F4-1, F5

수집된 정보(스캔 결과 + 사용자 답변)를 바탕으로 4개 파일을 생성하는 로직 및 템플릿.

**생성 파일별 내용 정의:**

**`CLAUDE.md`**
```
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

**`docs/conventions.md`**
- 감지된 언어의 네이밍 컨벤션
- 파일/디렉토리 구조 패턴
- 코드 스타일 (들여쓰기, 줄 길이 등)
- 사용자 답변으로 수집한 팀 선호 패턴

**`docs/architecture.md`**
- 프로젝트 디렉토리 구조 (실제 스캔 결과 반영)
- 레이어 구성 (감지된 스택 기반)
- 주요 설계 결정 (모노레포 여부, 멀티 모듈 등)

**`docs/setup.md`**
- 실행 방법 (감지된 패키지 매니저 기반)
- 테스트 실행 명령
- 빌드 명령
- 환경 변수 안내 (`.env.example` 존재 시)

**완료 기준:**
- 4개 파일 생성 완료
- 병합 모드: 기존 내용 + 새 내용 합쳐서 생성
- 완료 후 생성된 파일 목록 출력
- "다음 단계: `/genie:brainstorm`" 안내 출력

**테스트 시나리오 (Covers AE1, AE2, AE4):**
- Happy: Spring Boot 감지 → Java 컨벤션 기반 conventions.md 생성
- Happy: Next.js 감지 → TypeScript 컨벤션 기반 conventions.md 생성
- Edge: 모노레포 → architecture.md에 서브 프로젝트별 레이어 분리 기록
- Edge: 병합 모드 → 기존 CLAUDE.md 내용 보존 + 새 섹션 추가

---

## 리스크

| 리스크 | 완화 방법 |
|--------|---------|
| 스캔 신호 부재 (완전 빈 디렉토리) | AE3 처리: 언어/프레임워크 직접 질문으로 폴백 |
| 모노레포 감지 오탐 | backend/ + frontend/ 공존 + 각각 빌드 파일 존재 시에만 모노레포로 판단 |
| 병합 시 중복 섹션 | 동일 섹션 헤더(`##`) 존재 시 기존 내용 아래에 "--- Updated ---" 구분선 후 추가 |
| `AskUserQuestion` 도구 미지원 | 채팅 폴백 명시, 질문 건너뛰지 않음 |

---

## 빌드 순서

```
U1 (commands/setup.md)
  ↓
U2 (스택 감지)
  ↓
U3 (충돌 감지)
  ↓
U4 (질문 플로우)
  ↓
U5 (문서 생성)
```

모든 단위가 단일 파일(`skills/setup/SKILL.md`)에 순서대로 작성됨.
U1(`commands/setup.md`)은 독립적으로 먼저 생성 가능.

---

## 다음 단계

→ `/genie:work docs/plans/2026/05/13-genie-setup-plan.md`

> **참고:** 이 작업은 Claude 지시 문서(SKILL.md, commands/*.md)를 작성하는 것으로, 유닛 테스트 대상이 없어 `/genie:test` 단계는 스킵합니다.
