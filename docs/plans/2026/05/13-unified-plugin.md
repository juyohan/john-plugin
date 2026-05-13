---
date: 2026-05-13
origin: docs/brainstorms/2026/05/13-unified-plugin.md
---

# Unified Plugin — Implementation Plan

---

## Context

**Origin:** `docs/brainstorms/2026/05/13-unified-plugin.md`
**현재 상태 (계획 기준일):**
- Assets 완료: skills 34개, agents 29개, rules 13개, docs 구조 6개 디렉토리
- 미구현: commands 보완, 프로젝트 감지(R-8), install.sh(R-7), ce-help(R-5), 훅 프로파일(R-4/R-6)

---

## Decisions

| ID | 결정 | 근거 |
|----|------|------|
| D-1 | 프로젝트 감지는 Node.js 스크립트로 구현 | 기존 hooks 인프라가 Node.js 기반, 일관성 유지 |
| D-2 | ce-help는 별도 command 파일로 구현 | 다른 CE commands와 동일한 패턴 |
| D-3 | 훅 프로파일은 환경 변수(`ECC_HOOK_PROFILE`)로 제어 | 코드 수정 없이 오버라이드 가능 (R-6 충족) |
| D-4 | install.sh는 `~/.claude/agents/`와 `~/.claude/rules/`에 심볼릭 링크 생성 | 파일 복사 대신 링크 → 레포 업데이트 시 자동 반영 |
| D-5 | commands는 skill을 invoke하는 stub 형태 | CE 원본 패턴과 동일 |

---

## Scope Boundaries

**이 계획에 포함**
- U1: 누락 commands 추가 (ce-ideate, ce-strategy, ce-debug, ce-code-review, ce-commit, ce-optimize, tdd-guide)
- U2: 프로젝트 감지 스크립트 (`scripts/detect-project.js`)
- U3: ce-help command
- U4: install.sh (agents + rules 심볼릭 링크, hooks 설정)
- U5: 훅 프로파일 환경 변수 지원

**이 계획 밖 (다음 단계)**
- R-8 자동 감지의 hooks 연동 자동화 (현재: 수동 실행)
- GUI 설정 인터페이스
- 마켓플레이스 등록

---

## Requirements Traceability

| U-ID | Requirements |
|------|-------------|
| U1 | R-1 (CE 워크플로우 진입점) |
| U2 | R-8 (프로젝트 감지 기반 추천) |
| U3 | R-5 (워크플로우 안내 레이어) |
| U4 | R-7 (단일 설치 경험) |
| U5 | R-4 (훅 인프라), R-6 (커스터마이즈 레이어) |

---

## Implementation Units

### U1: 누락 Commands 추가
**목적:** CE 전체 워크플로우를 `/` 명령어로 진입할 수 있도록 command stub 파일 추가

**파일:**
- `commands/ce-ideate.md` (신규)
- `commands/ce-strategy.md` (신규)
- `commands/ce-debug.md` (신규)
- `commands/ce-code-review.md` (신규)
- `commands/ce-commit.md` (신규)
- `commands/ce-optimize.md` (신규)
- `commands/tdd-guide.md` (신규)

**패턴:** 기존 `commands/ce-brainstorm.md`와 동일한 stub 형태
```
---
description: <스킬 설명>
---
# `<skill-name>`
> <한 줄 설명>
```

**의존성:** 없음 (skills/에 해당 SKILL.md 존재 확인 필요)

**테스트 시나리오:**
- `/ce-ideate` 실행 시 `skills/ce-ideate/SKILL.md` 내용이 로드된다
- `/ce-debug` 실행 시 `skills/ce-debug/SKILL.md` 내용이 로드된다
- 모든 7개 command가 Claude Code에서 `/` 자동완성으로 표시된다

---

### U2: 프로젝트 감지 스크립트
**목적:** 프로젝트 루트 파일을 감지하여 적합한 agents/rules/skills를 제안 (R-8)

**파일:**
- `scripts/detect-project.js` (신규)

**감지 → 추천 매핑:**
```
감지 파일                         언어       추천 agent                  추천 rules          추천 skills
────────────────────────────────────────────────────────────────────────────────────────────────────
package.json + tsconfig.json     TypeScript  typescript-reviewer         typescript, web     frontend-patterns, vite-patterns
nuxt.config.* / vue.config.*     Vue/Nuxt    typescript-reviewer         typescript, web     nuxt4-patterns, ui-to-vue
requirements.txt / pyproject.*   Python      python-reviewer             python              coding-standards
go.mod                           Go          go-reviewer, go-build-resolver  golang          backend-patterns
pom.xml / build.gradle           Java        java-reviewer, java-build-resolver  java        springboot-patterns, jpa-patterns
build.gradle.kts                 Kotlin      kotlin-reviewer, kotlin-build-resolver  kotlin  —
*.xcodeproj / Package.swift      Swift       swift-reviewer, swift-build-resolver  swift     —
Cargo.toml                       Rust        —                           rust                —
composer.json                    PHP         —                           php                 —
```

**출력:** stdout에 마크다운 형식으로 추천 목록
**실행:** `node scripts/detect-project.js [프로젝트경로]`
**의존성:** Node.js `fs` 모듈만 사용 (외부 의존성 없음)

**테스트 시나리오:**
- `package.json` + `tsconfig.json` 존재 시 → `typescript-reviewer` 추천 포함
- `nuxt.config.ts` 존재 시 → `nuxt4-patterns` 추천 포함
- `go.mod` 존재 시 → `go-reviewer`와 `go-build-resolver` 모두 추천
- 감지 파일 없을 시 → "프로젝트 타입을 감지할 수 없습니다" 출력
- 여러 언어 파일 동시 존재 시 → 모두 포함하여 출력

---

### U3: ce-help Command
**목적:** 팀원이 현재 상황에서 어떤 CE 스킬/커맨드를 써야 하는지 안내 (R-5)

**파일:**
- `commands/ce-help.md` (신규)

**안내 내용 (단계별 라우팅):**
```
현재 상태                  → 다음 단계
─────────────────────────────────────────
아이디어만 있음             → /ce-ideate 또는 /ce-brainstorm
요구사항 문서 있음          → /ce-plan
계획 문서 있음              → /tdd-guide → /ce-work
코드 작성 완료              → /ce-code-review
리뷰 완료                   → /ce-commit
작업 완료, 정리 필요        → /ce-compound
막혔을 때                   → /ce-debug
성능 이슈                   → /ce-optimize
프로젝트 맞춤 도구 확인     → scripts/detect-project.js 실행
```

**의존성:** U1 완료 (모든 commands 존재해야 링크 유효)

**테스트 시나리오:**
- `/ce-help` 실행 시 단계별 안내 테이블이 표시된다
- 각 단계에서 추천하는 command가 실제 존재하는 command와 일치한다

---

### U4: install.sh
**목적:** `git clone` 후 한 번 실행으로 전체 세팅 완료 (R-7)

**파일:**
- `install.sh` (신규)

**처리 순서:**
1. `~/.claude/agents/` 디렉토리 확인 및 생성
2. `agents/` 내 모든 `.md` 파일 → `~/.claude/agents/`에 심볼릭 링크 (기존 파일 있으면 skip)
3. `~/.claude/rules/` 디렉토리 확인 및 생성
4. `rules/` 내 모든 디렉토리 → `~/.claude/rules/`에 심볼릭 링크 (기존 있으면 skip)
5. hooks 설치 안내 메시지 출력 (`hooks/hooks.json` 병합 방법)
6. 완료 메시지: 설치된 agents 수, rules 수 출력

**의존성:** 없음 (독립 실행)

**테스트 시나리오:**
- `install.sh` 실행 후 `~/.claude/agents/tdd-guide.md` 심볼릭 링크가 존재한다
- `install.sh` 실행 후 `~/.claude/rules/typescript/` 심볼릭 링크가 존재한다
- 이미 링크가 존재하면 skip 메시지를 출력하고 기존 링크를 유지한다
- 실행 후 설치된 agents 수와 rules 수가 stdout에 출력된다

---

### U5: 훅 프로파일 환경 변수 지원
**목적:** 코드 수정 없이 훅 프로파일 선택 가능 (R-4, R-6)

**파일:**
- `config/profiles.json` (신규) — 프로파일별 활성화 훅 목록
- `scripts/hooks/check-hook-enabled.js` (수정) — `ECC_HOOK_PROFILE` 읽기 추가

**프로파일 정의 (`config/profiles.json`):**
```json
{
  "minimal":  ["gateguard-fact-force"],
  "standard": ["gateguard-fact-force", "observe-runner", "doc-file-warning", "suggest-compact"],
  "strict":   ["gateguard-fact-force", "observe-runner", "doc-file-warning", "suggest-compact",
               "check-console-log", "block-no-verify", "evaluate-session"]
}
```

**사용법:** `export ECC_HOOK_PROFILE=strict`
**기본값:** `standard`

**의존성:** `scripts/hooks/check-hook-enabled.js` 현재 구조 파악 선행 필요

**테스트 시나리오:**
- `ECC_HOOK_PROFILE=minimal` 설정 시 GateGuard만 활성화된다
- `ECC_HOOK_PROFILE=strict` 설정 시 모든 훅이 활성화된다
- 환경 변수 미설정 시 `standard` 프로파일이 기본 적용된다
- 잘못된 프로파일 값 입력 시 `standard`로 폴백하고 경고 출력

---

## Build Order

```
병렬 실행 가능
├── U1: commands 추가       (독립)
├── U2: detect-project.js  (독립)
├── U4: install.sh          (독립)
└── U5: 훅 프로파일         (check-hook-enabled.js 분석 선행)

순차 필요
└── U3: ce-help             (U1 완료 후)
```

---

## Risks & Mitigations

| 위험 | 영향 | 완화 |
|------|------|------|
| install.sh symlink가 기존 `~/.claude` 설정과 충돌 | 기존 agents/rules 덮어쓰기 | 링크 생성 전 존재 확인 후 skip |
| check-hook-enabled.js 내부 구조가 예상과 다름 | U5 구현 복잡도 증가 | 파일 먼저 읽고 패턴 파악 후 구현 |
| command stub이 skill invoke 방식과 안 맞음 | commands 동작 안 함 | 기존 `ce-brainstorm.md` 패턴 정확히 복사 |
