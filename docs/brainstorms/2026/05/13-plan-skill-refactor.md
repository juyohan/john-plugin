---
title: "skills/plan 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: draft
---

## Summary

`skills/plan/SKILL.md`(930줄) + `references/` 5개(745줄) = 1,675줄을 단일 SKILL.md ~200줄로 줄인다.
brainstorm 리팩토링처럼 "합치는" 것이 아니라 **설명을 제거하고 지시만 남기는 증류(distillation)** 가 핵심이다.
중간 읽기("멈추고 지금 읽어라") 패턴을 완전히 제거하여 에이전트 연산 신뢰도를 높인다.

## Problem Frame

현재 `skills/plan`의 문제는 두 가지다:

1. **중간 읽기 패턴의 불안정성**: `"멈추십시오. 지금 references/synthesis-summary.md를 읽으십시오."` 같은 지시는 에이전트가 실제로 그 시점에 멈추고 파일을 읽을 것을 가정하지만, 이 가정은 불안정하다. 파일이 길다는 것보다 더 심각한 문제다.

2. **지시가 아닌 설명 위주의 구조**: 현재 1,675줄의 대부분은 "왜 이 규칙이 존재하는지", 안티패턴 예시, 엣지 케이스 헤징으로 구성된다. 에이전트는 지시만 있어도 맥락 추론 능력으로 올바르게 작동하므로 이 설명들은 노이즈다.

## Requirements

- **R1**: 실행 중 외부 파일 읽기 0회 (references/ 폴더 전체 삭제)
- **R2**: SKILL.md 200줄 이하
- **R3**: 다섯 개 references의 핵심 기능을 모두 보존
  - synthesis-summary: Stated/Inferred/Out 3-bucket + 헤드리스 동작
  - deepening-workflow: confidence check 조건 + 에이전트 할당 규칙
  - plan-handoff: 핸드오프 옵션 + 라우팅 규칙
  - universal-planning: 비소프트웨어 분기 + 핵심 조정
  - visual-communication: 다이어그램 조건 1줄
- **R4**: 심화 자동 트리거(Phase 5.3 confidence check) 동작 보존
- **R5**: `--add gemini` 플래그 동작 보존
- **R6**: 요구사항 문서 기반 플랜(brainstorm-sourced) 동작 보존
- **R7**: 플랜 품질 기준 보존 (추적성, 테스트 시나리오, 상대 경로 규칙)

## Scope Boundaries

**포함:**
- `skills/plan/SKILL.md` — 완전 재작성 (설명 제거, 지시만 증류)
- `skills/plan/references/` — 폴더 전체 삭제 (5개 파일)

**제외:**
- `skills/SKILL.md` (base) — 수정 없음
- 다른 `skills/*/SKILL.md` 파일들
- `commands/` 디렉토리

## Key Decisions

| 결정 | 내용 | 근거 |
|------|------|------|
| 증류 우선 | 설명 제거, 지시만 보존 | 에이전트는 이유 없이 규칙만 있어도 추론 가능 |
| Phase 체계 단순화 | 0.1b, 1.4b 같은 소수점 서브-페이즈 제거 → 순차 섹션 | 복잡한 번호 체계는 탐색 비용 증가 |
| deepening 자동 트리거 유지 | --deepen 플래그 전환 없음 | 사용자 경험 변경 없이 내부 구조만 개선 |
| 목표 분량 200줄 | brainstorm(99줄)보다 길되 복잡도 반영 | 1,675줄 → 200줄 = 88% 감소 |

## Actors

- **A1**: `skills/plan`을 호출하는 에이전트
- **A2**: 플랜 작성을 요청하는 사용자

## Key Flows

- **F1**: 요구사항 문서 기반 플랜 작성 (brainstorm 산출물 → plan)
- **F2**: bare 입력 기반 플랜 작성 (기능 설명 또는 빈 입력)
- **F3**: 심화 패스 (deepen intent 또는 confidence check 자동 트리거)
- **F4**: 비소프트웨어 플랜 (학습 계획, 이벤트, 여행 등)

## Acceptance Examples

- **AE1**: F1 — 요구사항 문서 경로 입력 시 SKILL.md 단독으로 플랜 완성 (중간 파일 읽기 없음)
- **AE2**: F3 — 플랜 작성 후 confidence check 자동 실행, 심화 필요 시 인라인 로직으로 처리
- **AE3**: F4 — "학습 계획 세워줘" 입력 시 비소프트웨어 분기가 SKILL.md 내 지시로 처리

## Success Criteria

- `skills/plan/references/` 폴더 존재하지 않음
- `skills/plan/SKILL.md` 내 `references/` 경로 참조 없음
- SKILL.md 200줄 이하
- F1~F4 주요 흐름이 단일 파일에서 완결
- `"멈추십시오. 지금 읽으십시오."` 패턴 없음
