---
title: "skills/work 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: draft
---

## Summary

`skills/work/SKILL.md`(388줄) + `references/` 2개(291줄) = 679줄을 단일 SKILL.md ~180줄로 줄인다.
brainstorm/plan과 동일한 **증류(distillation)** 방식 — 설명 제거, 지시만 보존, 중간 읽기 패턴 제거.
존재하지 않는 에이전트/스킬 참조를 실존하는 것으로 교체하거나 제거한다.
commit/PR 단계는 work 스킬에서 처리하지 않고 사용자에게 핸드오프한다.

## Problem Frame

1. **중간 읽기 패턴**: line 344에서 `"references/shipping-workflow.md를 반드시 읽으세요"` — plan과 동일한 불안정 패턴
2. **존재하지 않는 참조**: `ce-figma-design-sync`, `ce-code-review`, `ce-commit-push-pr`, `ce-commit`, `ce-demo-reel`, `ce-worktree` — 모두 실행 불가
3. **tracker-defer.md 전체가 ce-code-review 전용**: JSON 아티팩트 경로까지 ce-code-review 구조에 종속. 인라인 불가
4. **commit/PR 처리 범위 혼재**: work 스킬이 commit/push/PR까지 처리 — 각 스킬의 단일 책임 원칙 위반

## Requirements

- **R1**: 실행 중 외부 파일 읽기 0회 (references/ 삭제)
- **R2**: SKILL.md 180줄 이하
- **R3**: references 핵심 기능 보존
  - `shipping-workflow.md`: 테스트 실행, simplify, 코드 리뷰 티어, 잔여 발견 사항 게이트, 최종 검증, 운영 검증 계획
  - `tracker-defer.md`: 핵심 개념("잔여 발견 사항은 프로젝트 트래커에 티켓 생성")만 1줄로 보존
- **R4**: commit/PR 단계 제거 — work 스킬은 최종 검증까지만 처리하고 `/genie:commit` 또는 push-pr 스킬로 핸드오프
- **R5**: 존재하지 않는 참조 처리
  - `ce-code-review` → `/genie:review`
  - `ce-commit-push-pr`, `ce-commit` → 제거 (핸드오프로 대체)
  - `/simplify` → `simplify 스킬` (커맨드 없음)
  - `ce-worktree` → `worktree 스킬` (커맨드 없음)
  - `ce-figma-design-sync` → 제거, 텍스트로 대체
  - `ce-demo-reel` → 제거
- **R6**: 언어 통일 — `Base guidelines` → `기본 가이드라인`
- **R7**: 단계 번호 단순화 → `## 1~5` 순차 섹션

## Scope Boundaries

**포함:**
- `skills/work/SKILL.md` — 완전 재작성
- `skills/work/references/` — 2개 파일 전체 삭제

**제외:**
- `commands/work.md`
- `skills/commit/SKILL.md`, `skills/push-pr/SKILL.md`
- `commands/commit.md` 내 경로 오류 (`skills/genie:commit/SKILL.md`) — 별도 수정 필요

## Key Decisions

| 결정 | 내용 |
|------|------|
| commit/PR 핸드오프 | work 스킬은 최종 검증 후 "다음: `/genie:commit` 또는 push-pr 스킬" 안내로 종료 |
| tracker-defer 축약 | 149줄 프로토콜 → "잔여 발견 사항: 수정/티켓 생성(AGENTS.md 트래커)/수락/중단" 1줄 |
| simplify/worktree | 슬래시 커맨드 없음 → `simplify 스킬`, `worktree 스킬`로 참조 |
| Figma 참조 | 에이전트 없이 "Figma 디자인이 있으면 구현과 일치할 때까지 비교" 텍스트로 대체 |

## Actors

- **A1**: `skills/work`를 호출하는 에이전트
- **A2**: 구현을 요청하는 사용자

## Key Flows

- **F1**: 계획 문서 기반 실행 (plan 산출물 → work)
- **F2**: 단순 프롬프트 기반 실행 (bare 입력 → 복잡도 분류 → 실행)
- **F3**: 품질 검사 후 핸드오프 (`/genie:commit` 또는 push-pr 스킬로)

## Acceptance Examples

- **AE1**: F1 — 계획 문서 경로 입력 시 중간 파일 읽기 없이 실행 완료 후 commit 핸드오프 안내
- **AE2**: F2 — bare 입력 시 복잡도 분류 → 작업 목록 → 실행 → 최종 검증 → 핸드오프
- **AE3**: F3 — 품질 검사 완료 후 commit/PR을 직접 처리하지 않고 다음 단계 안내만 제공

## Success Criteria

- `skills/work/references/` 폴더 존재하지 않음
- SKILL.md 내 `references/` 경로 참조 없음
- SKILL.md 180줄 이하
- commit/PR 처리 코드 없음 (핸드오프 안내만 존재)
- 존재하지 않는 에이전트/스킬 이름 없음
- 한국어 통일 (`기본 가이드라인`)
