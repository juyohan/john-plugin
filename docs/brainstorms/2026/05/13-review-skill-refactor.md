---
title: "skills/review 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: draft
---

## Summary

`skills/review/SKILL.md`(931줄) + `references/`(1165줄) = 총 2096줄을 **증류(distillation)** + **구조 교정**으로 줄인다.

핵심 발견:
- `references/` 파일 8개 중 **4개는 mid-workflow read 패턴** (@ import 아님) — 이것이 anti-pattern
- 4개를 @ compile-time import로 전환하면 런타임 오버헤드 제거 + 동작 안정성 향상
- 나머지 복잡성은 부하 수반형(load-bearing) 프로토콜 — 압축만 가능

목표: 2096줄 → **~1300줄** (~38% 감소)

## Problem Frame

1. **Mid-workflow read anti-pattern**: 4개 파일이 @ import 아닌 텍스트 지시로 로드됨
   - `walkthrough.md`: `"전체적으로 읽으십시오"` (SKILL.md line 779)
   - `tracker-defer.md`: `"를 통해"` 반복 참조 (lines 763, 774, 781, 791, 799)
   - `bulk-preview.md`: `"를 로드합니다"` (line 799)
   - `validator-template.md`: `"를 사용하여"` (line 579)
2. **references/ 파일 장황함**: subagent-template.md(181L), walkthrough.md(249L) — 설명적 텍스트 과다
3. **SKILL.md Gemini 보일러플레이트**: 14줄 5단계 → 3줄로 축약 가능
4. **모드 규칙 중복**: 4개 모드 섹션에 반복 패턴 존재
5. **언어 혼재**: `Base guidelines` → `기본 가이드라인`

## Requirements

**SKILL.md:**
- **R1**: SKILL.md 700줄 이하
- **R2**: Gemini 섹션 축약 → 3줄 형식 (plan/work 패턴 일치)
- **R3**: 언어 통일 — `Base guidelines` → `기본 가이드라인`
- **R4**: 모드 규칙 중복 패턴 압축 (핵심 지시만 유지)
- **R5**: 4개 mid-workflow read 지시 제거 → @ import로 대체

**references/:**
- **R6**: `subagent-template.md` 압축 — 신뢰도 루브릭·오탐 카탈로그 설명 제거, 핵심 규칙만 유지 (181L → ~110L)
- **R7**: `walkthrough.md` 압축 — 반복 AskUserQuestion 안내 통합, 예시 압축 (249L → ~150L)
- **R8**: `tracker-defer.md` 압축 — 프로브 설명·폴백 체인 설명 압축 (149L → ~80L)
- **R9**: `bulk-preview.md` 압축 — 설명 → 지시로 압축 (112L → ~65L)
- **R10**: `review-output-template.md` 압축 — 안티패턴 예시 압축, 규칙 중복 제거 (152L → ~100L)
- **R11**: 4개 파일을 SKILL.md 하단 @ import 섹션에 추가
- **R12**: `persona-catalog.md`(67L), `diff-scope.md`(31L), `findings-schema.json` — 변경 없음

**불변:**
- **R13**: Stage 1-6 핵심 프로토콜 + shell 명령 보존
- **R14**: 4가지 모드 계약 규칙 완전 보존 (압축만 허용)
- **R15**: 리뷰어 페르소나 표 18개 보존
- **R16**: `scripts/resolve-base.sh` 유지

## Scope Boundaries

**포함:**
- `skills/review/SKILL.md` — 부분 재작성
- `skills/review/references/subagent-template.md` — 압축
- `skills/review/references/walkthrough.md` — 압축
- `skills/review/references/tracker-defer.md` — 압축
- `skills/review/references/bulk-preview.md` — 압축
- `skills/review/references/review-output-template.md` — 압축

**제외:**
- `skills/review/references/persona-catalog.md` — 변경 없음
- `skills/review/references/diff-scope.md` — 변경 없음
- `skills/review/references/findings-schema.json` — 변경 없음
- `skills/review/references/validator-template.md` — 변경 없음 (이미 간결, 85L)
- `skills/review/scripts/` — 변경 없음

## Key Decisions

| 결정 | 내용 |
|------|------|
| @ import 전환 | 4개 mid-workflow read 파일을 SKILL.md 하단 @ import 섹션에 추가. 런타임 read 제거 |
| 신뢰도 루브릭 압축 | 5개 앵커(0/25/50/75/100) 정의 유지, 행동 기준 예시만 1줄씩으로 압축 |
| 오탐 카탈로그 압축 | 9개 카테고리 → 제목 + 핵심 규칙 1줄 형식 |
| walkthrough 예시 제거 | Finding N of M 예시 블록 제거, 형식 규칙만 유지 |
| tracker-defer 설명 압축 | 감지 로직 + 프로브 절차 설명 → 핵심 지시만 |
| 파일 분리 불필요 | 압축으로 충분. 파일 수 현행 유지 |

## Acceptance Examples

- **AE1**: SKILL.md 700줄 이하, references/ 8개 파일 그대로 존재
- **AE2**: `walkthrough/tracker-defer/bulk-preview/validator-template` 모두 SKILL.md 하단 @ import 목록에 존재
- **AE3**: SKILL.md에 `references/walkthrough.md를 읽으십시오` 같은 mid-workflow read 지시 없음
- **AE4**: `--add gemini` 처리 3줄 이하, `기본 가이드라인` 통일
- **AE5**: Stage 1-6 shell 명령 블록 변경 없음
- **AE6**: 4가지 모드 핵심 계약 규칙 모두 존재

## Success Criteria

- SKILL.md 700줄 이하
- references/ 총 줄 수 700줄 이하 (현재 1165줄)
- SKILL.md에 `references/` 파일 mid-workflow read 지시 없음
- SKILL.md 하단 @ import 목록에 9개 파일 모두 포함
- Stage 1-6 + 4가지 모드 + 18개 페르소나 모두 보존

## Risks

| 위험 | 완화 |
|------|------|
| 신뢰도 루브릭 압축 중 앵커 행동 기준 손실 | 0/25/50/75/100 정의 + 핵심 행동 기준 유지 |
| walkthrough 옵션 메뉴 변형 규칙 누락 | adaptive adjustments 섹션 구조 보존 |
| tracker-defer 폴백 체인 순서 손실 | 1→2→3 체인 순서와 `no_sink` 동작 보존 |
| @ import 추가 후 SKILL.md 컴파일 크기 증가 | 동시에 SKILL.md 본문 압축으로 상쇄 |
