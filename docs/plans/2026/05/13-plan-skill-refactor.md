---
title: "skills/plan 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: active
origin: docs/brainstorms/2026/05/13-plan-skill-refactor.md
---

## Summary

`skills/plan/SKILL.md`(930줄) + `references/` 5개(745줄) = 1,675줄을 단일 `SKILL.md` 200줄 이하로 줄인다.
"합치기"가 아닌 **증류(distillation)** — 설명과 이유를 제거하고 지시만 남긴다.
워크플로우 중간 "멈추고 지금 읽어라" 패턴을 완전히 제거하여 에이전트 연산 신뢰도를 높인다.

## Problem Frame

**P1 중간 읽기 패턴**: `"references/synthesis-summary.md를 읽으십시오"` 구조는 에이전트가 실제로 그 시점에 파일을 읽을 것을 가정하나 이 가정은 불안정하다. 파일 길이 문제보다 심각하다.

**P2 설명 과잉**: 1,675줄의 대부분이 "왜 이 규칙인지", 안티패턴 예시, 엣지 케이스 헤징이다. 에이전트는 지시만 있어도 맥락 추론으로 올바르게 작동한다.

## Requirements

- **R1**: 실행 중 외부 파일 읽기 0회 (references/ 전체 삭제)
- **R2**: SKILL.md 200줄 이하
- **R3**: 5개 references 핵심 기능 모두 보존
  - synthesis-summary → Stated/Inferred/Out + 헤드리스 동작
  - deepening-workflow → confidence check 조건 + 에이전트 할당
  - plan-handoff → 핸드오프 옵션 5개 + 라우팅
  - universal-planning → 비소프트웨어 분기 + 핵심 조정
  - visual-communication → 다이어그램 조건
- **R4**: 심화 자동 트리거(confidence check) 동작 보존
- **R5**: `--add gemini` 플래그 동작 보존
- **R6**: 요구사항 문서 기반 플랜(brainstorm-sourced) 동작 보존
- **R7**: 플랜 품질 기준 보존 (R-ID 추적성, 테스트 시나리오, 상대 경로 규칙)

## Scope Boundaries

**포함:**
- `skills/plan/SKILL.md` — 완전 재작성 (설명 제거, 지시만 증류)
- `skills/plan/references/` — 5개 파일 전체 삭제

**제외:**
- `skills/SKILL.md` (base), 다른 스킬 파일, `commands/`

## Key Technical Decisions

| 결정 | 내용 |
|------|------|
| 증류 전략 | 설명/이유 제거, 규칙만 압축. 에이전트는 why 없이도 추론 가능 |
| Phase 번호 단순화 | `0.1b`, `1.4b` 같은 소수점 서브-페이즈 → `## 1~8` 순차 섹션 |
| deepening 자동 유지 | `--deepen` 플래그 전환 없음. confidence check는 인라인으로 보존 |
| 목표 분량 200줄 | brainstorm(99줄)보다 길되 복잡도에 비례. 1,675줄 → 88% 감소 |

## Actors

- **A1**: `skills/plan`을 호출하는 에이전트
- **A2**: 플랜 작성을 요청하는 사용자

## Key Flows

- **F1**: 요구사항 문서 기반 플랜 작성 (brainstorm 산출물 → plan)
- **F2**: bare 입력 기반 플랜 작성 (기능 설명 또는 빈 입력)
- **F3**: 심화 패스 (deepen intent 또는 confidence check 자동 트리거)
- **F4**: 비소프트웨어 플랜 (학습 계획, 이벤트, 여행 등)

## Implementation Units

### - U1. references 핵심 내용 추출

**읽을 파일:** `skills/plan/references/*.md` (5개)

각 파일에서 인라인할 핵심 지시를 추출한다:

| 파일 | 현재 | 목표 | 추출 내용 |
|------|------|------|-----------|
| `synthesis-summary.md` | 245줄 | ~25줄 | 3-bucket 정의, solo/brainstorm-sourced 변형, headless 라우팅, 확인 루프 규칙 |
| `deepening-workflow.md` | 249줄 | ~35줄 | 점수 산정 기준, 섹션별 체크리스트 압축, 에이전트 할당, interactive/auto 모드 |
| `plan-handoff.md` | 106줄 | ~20줄 | ce-doc-review headless 실행, 5가지 post-generation 옵션, pipeline 모드 예외 |
| `universal-planning.md` | 114줄 | ~25줄 | 분류 확인, 모호성 질문, 조사 필요성 판단, 템플릿 조정 규칙 |
| `visual-communication.md` | 31줄 | ~3줄 | 다이어그램 추가 조건 (4개 이상 단위, 3개 이상 상호작용 표면 등) |

**검증 기준:**
- 5가지 기능 영역이 모두 추출됨
- 각 추출 결과가 목표 줄수 이하
- 설명/예시/근거 없이 지시만 남음

---

### - U2. SKILL.md 재작성

**수정할 파일:** `skills/plan/SKILL.md`

U1 추출 결과를 사용해 아래 8개 섹션 구조로 재작성한다.

**목표 섹션 구조:**
```
## 1. 분류
## 2. 소스 확인
## 3. 범위 종합 (Synthesis)
## 4. 조사
## 5. 플랜 구조화
## 6. 플랜 작성
## 7. 심화 및 핸드오프
## 8. 비소프트웨어 플래닝
```

**유지할 기능 목록:**
1. 소프트웨어 vs. 비소프트웨어 분류 (→ 섹션 8 라우팅)
2. 기존 플랜 재개 / deepen intent 감지
3. 요구사항 문서 소스 감지 및 R/A/F/AE-ID 추적
4. 플래닝 부트스트랩 (bare 입력)
5. 범위 종합 (Stated/Inferred/Out) — solo/brainstorm-sourced 변형
6. 병렬 컨텍스트 조사 (repo + learnings)
7. U-ID 안정성 규칙
8. 구현 단위 정의 + 테스트 시나리오 카테고리
9. 플랜 깊이 가이드 (Lightweight/Standard/Deep)
10. 플랜 템플릿 섹션 목록
11. confidence check 자동 트리거 + 에이전트 할당
12. post-generation 5가지 옵션
13. `--add gemini` 플래그
14. 비소프트웨어 분기 (섹션 8)

**검증 기준:**
- 파일 200줄 이하
- `references/` 경로 참조 없음
- `"멈추십시오"` / `"지금 읽으십시오"` 패턴 없음
- 14개 기능이 모두 단일 파일에 존재
- Phase 소수점 번호(0.1b, 1.4b 등) 없음

**테스트 시나리오 (Covers F1~F4):**
- [F1 happy] 요구사항 문서 경로 입력 → 중간 파일 읽기 없이 플랜 완성. Covers AE1.
- [F2 happy] bare 입력 → 부트스트랩 흐름, Stated/Inferred/Out 종합 후 플랜 작성
- [F3 happy] "deepen the plan" 입력 → confidence check 인라인 실행, 심화 필요 시 에이전트 할당. Covers AE2.
- [F4 happy] "학습 계획 세워줘" → 섹션 8 비소프트웨어 분기 처리. Covers AE3.
- [edge] `--add gemini` 플래그 → gem 도구 협업 후 결과 통합
- [edge] 기존 플랜 경로 입력 → 재개 or 심화 의도 분기
- [error] 빈 입력 → 플래닝 대상 질문 후 대기

---

### - U3. references/ 폴더 삭제

**삭제할 파일:** `skills/plan/references/` 전체 (5개 파일)

U2 완료 후 실행.

**검증 기준:**
- `skills/plan/references/` 폴더 없음
- `skills/plan/SKILL.md` 내 `references/` 경로 참조 없음

## Dependencies

```
U1 → U2 → U3
```

## Risks & Dependencies

| 위험 | 완화 |
|------|------|
| synthesis 확인 루프 규칙 누락 | U1에서 "수정은 확정이 아님" 규칙 명시적 추출 |
| deepening 에이전트 할당 매핑 손실 | U1에서 섹션별 에이전트 매핑 추출 |
| 재작성 후 플랜 품질 저하 | U2 후 실제 플랜 1회 작성으로 F1~F4 흐름 검증 권장 |
