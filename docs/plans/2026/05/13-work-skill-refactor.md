---
title: "skills/work 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: active
origin: docs/brainstorms/2026/05/13-work-skill-refactor.md
---

## Summary

`skills/work/SKILL.md`(389줄) + `references/` 2개(293줄) = 682줄을 단일 `SKILL.md` 180줄 이하로 줄인다.
brainstorm/plan과 동일한 **증류(distillation)** 방식 — 설명 제거, 지시만 보존, 중간 읽기 패턴 제거.
존재하지 않는 에이전트/스킬 참조를 실존하는 것으로 교체하거나 제거한다.
commit/PR 단계는 work 스킬에서 처리하지 않고 사용자에게 핸드오프한다.

## Requirements

- **R1**: 실행 중 외부 파일 읽기 0회 (references/ 삭제)
- **R2**: SKILL.md 180줄 이하
- **R3**: references 핵심 기능 보존
  - `shipping-workflow.md`: 테스트 실행, simplify 스킬, 코드 리뷰 티어, 잔여 발견 사항 게이트, 최종 검증, 운영 검증 계획
  - `tracker-defer.md`: "잔여 발견 사항은 AGENTS.md 트래커에 티켓 생성" 1줄로 축약
- **R4**: commit/PR 단계 제거 — work 스킬은 최종 검증까지만 처리하고 `/genie:commit` 또는 push-pr 스킬로 핸드오프
- **R5**: 존재하지 않는 참조 처리
  - `ce-code-review` → `/genie:review`
  - `ce-commit-push-pr`, `ce-commit` → 제거 (핸드오프로 대체)
  - `/simplify` → `simplify 스킬`
  - `ce-worktree` → `worktree 스킬`
  - `ce-figma-design-sync` → 제거, 텍스트로 대체
  - `ce-demo-reel` → 제거
  - `/ce-brainstorm` → `/genie:brainstorm`
  - `/ce-plan` → `/genie:plan`
  - `linting-agent` → "린터 실행 (AGENTS.md 참조)"
- **R6**: 언어 통일 — `Base guidelines` → `기본 가이드라인`
- **R7**: 단계 번호 단순화 → `## 1~5` 순차 섹션

## Scope Boundaries

**포함:**
- `skills/work/SKILL.md` — 완전 재작성
- `skills/work/references/` — 2개 파일 전체 삭제

**제외:**
- `commands/work.md`
- `skills/commit/SKILL.md`, `skills/push-pr/SKILL.md`

## Key Technical Decisions

| 결정 | 내용 |
|------|------|
| commit/PR 핸드오프 | work 스킬은 최종 검증 후 "`/genie:commit` 또는 push-pr 스킬" 안내로 종료 |
| tracker-defer 축약 | 149줄 프로토콜 → "수정 / AGENTS.md 트래커에 티켓 생성 / 수락 / 중단" 1줄 |
| simplify/worktree | 슬래시 커맨드 없음 → `simplify 스킬`, `worktree 스킬`로 참조 |
| Figma 참조 | 에이전트 없이 "Figma 디자인이 있으면 구현과 일치할 때까지 비교" 텍스트로 대체 |

## Implementation Units

### - U1. references 핵심 내용 추출

**읽을 파일:** `skills/work/references/shipping-workflow.md`, `skills/work/references/tracker-defer.md`

각 파일에서 인라인할 핵심 지시 추출:

| 파일 | 현재 | 목표 | 추출 내용 |
|------|------|------|-----------|
| `shipping-workflow.md` | 143줄 | ~40줄 | 테스트+린팅, simplify 조건, 코드 리뷰 Tier1/2 기준, 잔여 게이트 옵션, 최종 검증 체크리스트, 운영 검증 계획 |
| `tracker-defer.md` | 150줄 | 1줄 | "잔여 발견 사항: 수정 / AGENTS.md 트래커에 티켓 생성 / 수락 / 중단" |

**검증 기준:**
- 두 파일의 핵심 기능이 추출됨
- tracker-defer는 1줄로 축약됨
- 설명/예시 없이 지시만 남음

---

### - U2. SKILL.md 재작성

**수정할 파일:** `skills/work/SKILL.md`

U1 추출 결과를 사용해 아래 5개 섹션 구조로 재작성한다.

**목표 섹션 구조:**
```
## 1. 입력 분류
## 2. 준비
## 3. 실행
## 4. 품질 검사
## 5. 핸드오프
```

**유지할 기능 목록:**
1. `--add gemini` 플래그 지원
2. 입력 분류: 계획 문서 vs 단순 프롬프트, 복잡도 분류 (사소함/소형중형/대형)
3. 계획 읽기: 결정 결과물로 취급, U-ID, Execution note, Scope Boundaries, Deferred 섹션
4. 브랜치 설정: 기능 브랜치 확인, 새 브랜치(옵션 A), worktree 스킬(옵션 B), 기본 브랜치(옵션 C)
5. 작업 목록 생성: U-ID 접두사 유지
6. 실행 전략: 인라인/직렬/병렬 서브에이전트, 병렬 안전성 체크, worktree 격리
7. 실행 루프: 멱등성 체크, 테스트 발견, 시스템 전반 테스트 체크, 증분 커밋
8. simplify 스킬 (30라인 이상 변경 시)
9. 품질 검사: 테스트+린팅, /genie:review Tier1/2, 잔여 게이트, 최종 검증
10. 운영 검증 계획
11. 핸드오프: status → completed, /genie:commit 또는 push-pr 스킬 안내

**참조 교체:**
- `ce-code-review` → `/genie:review`
- `ce-commit-push-pr`, `ce-commit` → 제거 (섹션 5)
- `/simplify` → `simplify 스킬`
- `ce-worktree` → `worktree 스킬`
- `ce-figma-design-sync` → 텍스트로 대체
- `ce-demo-reel` → 제거
- `/ce-brainstorm` → `/genie:brainstorm`
- `/ce-plan` → `/genie:plan`
- `linting-agent` → "린터 실행 (AGENTS.md 참조)"
- `Base guidelines` → `기본 가이드라인`

**검증 기준:**
- 파일 180줄 이하
- `references/` 경로 참조 없음
- `ce-*` 에이전트 이름 없음
- commit/PR 처리 코드 없음 (핸드오프 안내만)
- 한국어 통일

**테스트 시나리오:**
- [happy] 계획 문서 경로 입력 → 중간 파일 읽기 없이 실행 완료 후 핸드오프 안내
- [happy] 단순 프롬프트 입력 → 복잡도 분류 → 작업 목록 → 실행 → 최종 검증 → 핸드오프
- [happy] 품질 검사 완료 후 commit/PR을 직접 처리하지 않고 다음 단계 안내만
- [edge] `--add gemini` 플래그 → gem 도구 협업 후 결과 통합
- [edge] Tier 2 리뷰 잔여 발견 사항 → 4가지 처리 옵션 제시

---

### - U3. references/ 폴더 삭제

**삭제할 파일:** `skills/work/references/` 전체 (2개 파일)

U2 완료 후 실행.

**검증 기준:**
- `skills/work/references/` 폴더 없음
- `skills/work/SKILL.md` 내 `references/` 경로 참조 없음

## Dependencies

```
U1 → U2 → U3
```

## Risks

| 위험 | 완화 |
|------|------|
| 잔여 게이트 4가지 옵션 누락 | U1에서 옵션 명시적 추출 |
| 병렬 서브에이전트 격리 규칙 손실 | U2에서 worktree 격리 조건 인라인 보존 |
| 핸드오프 후 사용자 혼란 | 섹션 5에 `/genie:commit` + push-pr 스킬 명확히 안내 |
