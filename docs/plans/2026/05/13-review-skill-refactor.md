---
title: "skills/review 스킬 파일 증류 리팩토링"
date: 2026-05-13
status: completed
origin: docs/brainstorms/2026/05/13-review-skill-refactor.md
---

## Summary

`skills/review/SKILL.md`(931줄) + `references/`(1165줄) = 총 2096줄을
**증류(distillation)** + **구조 교정**으로 줄인다.

핵심 작업:
- 4개 mid-workflow read 지시 → @ compile-time import로 전환
- SKILL.md 931줄 → 700줄 이하로 압축
- references/ 5개 파일 압축 (총 843줄 → ~505줄)
- persona-catalog / diff-scope / findings-schema / validator-template 변경 없음

## Requirements

**SKILL.md:**
- **R1**: 700줄 이하
- **R2**: Gemini 섹션 → 3줄 형식 (`--add gemini` 플래그 있으면 gem 도구로 협업 후 통합, 상단 명시)
- **R3**: `Base guidelines` → `기본 가이드라인` 통일
- **R4**: 4개 모드 섹션 중복 패턴 압축 (핵심 지시만 유지)
- **R5**: mid-workflow read 4개 지시 제거 → @ import로 대체

**references/:**
- **R6**: `subagent-template.md` 181줄 → ~110줄
- **R7**: `walkthrough.md` 249줄 → ~150줄
- **R8**: `tracker-defer.md` 149줄 → ~80줄
- **R9**: `bulk-preview.md` 112줄 → ~65줄
- **R10**: `review-output-template.md` 152줄 → ~100줄
- **R11**: 4개 파일을 SKILL.md 하단 @ import 섹션에 추가
- **R12**: `persona-catalog.md`, `diff-scope.md`, `findings-schema.json` — 변경 없음

**불변:**
- **R13**: Stage 1-6 핵심 프로토콜 + shell 명령 보존
- **R14**: 4가지 모드 계약 규칙 완전 보존 (압축만 허용)
- **R15**: 리뷰어 페르소나 표 18개 보존
- **R16**: `scripts/resolve-base.sh` 유지

## Scope Boundaries

**포함:**
- `skills/review/SKILL.md`
- `skills/review/references/subagent-template.md`
- `skills/review/references/walkthrough.md`
- `skills/review/references/tracker-defer.md`
- `skills/review/references/bulk-preview.md`
- `skills/review/references/review-output-template.md`

**제외:**
- `skills/review/references/persona-catalog.md` — 변경 없음
- `skills/review/references/diff-scope.md` — 변경 없음
- `skills/review/references/findings-schema.json` — 변경 없음
- `skills/review/references/validator-template.md` — 이미 간결 (85줄), 변경 없음
- `skills/review/scripts/` — 변경 없음

## Key Technical Decisions

| 결정 | 내용 |
|------|------|
| @ import 전환 | 4개 mid-workflow read 파일을 SKILL.md 하단 @ import 섹션에 추가. 런타임 read 제거 |
| 신뢰도 루브릭 압축 | 0/25/50/75/100 앵커 정의 유지, 행동 기준 예시 1줄씩으로 압축 |
| 오탐 카탈로그 압축 | 9개 카테고리 → 제목 + 핵심 규칙 1줄 형식 |
| walkthrough 예시 제거 | Finding N of M 예시 블록 제거, 형식 규칙만 유지 |
| tracker-defer 설명 압축 | 프로브 타이밍 + 폴백 체인 설명 → 핵심 지시만 |
| validator-template 제외 | 이미 85줄, 간결, @ import 이미 존재 |

## Implementation Units

### - U1. subagent-template.md 압축

**수정할 파일:** `skills/review/references/subagent-template.md` (181줄 → ~110줄)

압축 대상:
- 신뢰도 루브릭 5개 앵커(0/25/50/75/100): 앵커 값과 정의 유지, 각 앵커의 행동 예시 설명은 1줄로 압축
- 오탐 카탈로그 9개 카테고리: 카테고리 제목 + 핵심 규칙 1줄 형식으로 압축 (설명 단락 제거)
- 출력 계약, 스키마 강제, autofix_class 규칙, 변수 참조 테이블: 변경 없음

**검증 기준:**
- 줄 수 110줄 이하
- 5개 신뢰도 앵커(0/25/50/75/100) 모두 존재
- 9개 오탐 카테고리 제목 모두 존재
- autofix_class 규칙 보존

**테스트 시나리오:**
- [happy] 압축 후 5개 앵커 값(0, 25, 50, 75, 100) 모두 포함 → wc -l 결과 ≤ 110
- [edge] 오탐 카탈로그에서 9개 카테고리 이름 모두 grep 가능

---

### - U2. walkthrough.md 압축

**수정할 파일:** `skills/review/references/walkthrough.md` (249줄 → ~150줄)

압축 대상:
- `Finding N of M` 형식 예시 블록 제거 (형식 규칙만 유지)
- `AskUserQuestion` 관련 중복 안내 통합 (여러 곳에 분산된 내용 1회로)
- 각 옵션(Apply/Defer/Skip/Auto-resolve) 설명 문장 압축
- 적응형 조정(adaptive adjustments) 섹션 구조 보존

**검증 기준:**
- 줄 수 150줄 이하
- Apply/Defer/Skip/Auto-resolve 옵션 모두 존재
- 완료 보고서(통합 완료 보고서) 구조 보존
- 적응형 조정 섹션 존재

**테스트 시나리오:**
- [happy] 압축 후 4개 옵션 이름(Apply, Defer, Skip, Auto-resolve) grep 가능
- [happy] wc -l ≤ 150
- [edge] 완료 보고서 구조 키워드(completion report) 보존 확인

---

### - U3. tracker-defer.md 압축

**수정할 파일:** `skills/review/references/tracker-defer.md` (149줄 → ~80줄)

압축 대상:
- 감지 로직 + 프로브 절차 설명 단락 → 핵심 지시만 (예: 프로브 타이밍 설명 제거, 결과 캐싱 규칙만 유지)
- 폴백 체인 1→2→3 설명 단락 압축 (체인 순서 + `no_sink` 동작은 유지)
- Interactive/Non-interactive 두 모드 계약 보존
- 레이블 결정 로직(named_sink / any_sink) 보존

**검증 기준:**
- 줄 수 80줄 이하
- Interactive / Non-interactive 두 모드 존재
- 폴백 체인(3단계) 순서 보존
- `named_sink_available`, `any_sink_available` 로직 보존

**테스트 시나리오:**
- [happy] wc -l ≤ 80
- [happy] `named_sink_available`, `any_sink_available` grep 가능
- [edge] 폴백 체인 3단계(1→2→3 또는 tier-1/2/3) 순서 보존

---

### - U4. bulk-preview.md 압축

**수정할 파일:** `skills/review/references/bulk-preview.md` (112줄 → ~65줄)

압축 대상:
- 설명적 단락 → 지시형 1줄로 압축
- 프리뷰 구조 형식 보존 (범위 요약 + 발견 사항 줄 형식)
- Proceed/Cancel 의미론 보존
- 엣지 케이스(발견 사항 0개 등) 처리 보존

**검증 기준:**
- 줄 수 65줄 이하
- 프리뷰 구조(발견 사항 줄 형식) 보존
- Proceed/Cancel 분기 존재
- 엣지 케이스(0개 발견 사항) 처리 존재

**테스트 시나리오:**
- [happy] wc -l ≤ 65
- [happy] `Proceed`, `Cancel` grep 가능
- [edge] "0개" 또는 "no findings" 케이스 처리 보존

---

### - U5. review-output-template.md 압축

**수정할 파일:** `skills/review/references/review-output-template.md` (152줄 → ~100줄)

압축 대상:
- 안티패턴 예시 블록 압축 (예시 코드 제거, 규칙 설명만 유지)
- 중복 포맷 규칙 제거 (동일 규칙이 여러 번 언급된 경우)
- P0-P3 심각도 테이블 포맷 보존
- 발견 사항 필드 구조 보존

**검증 기준:**
- 줄 수 100줄 이하
- P0/P1/P2/P3 심각도 레벨 존재
- 발견 사항 포맷 구조 보존 (title, severity, file, line 등)

**테스트 시나리오:**
- [happy] wc -l ≤ 100
- [happy] P0, P1, P2, P3 grep 가능
- [edge] 안티패턴 섹션이 없어도 포맷 규칙은 남아있음 확인

---

### - U6. SKILL.md 압축 + @ import 전환

**수정할 파일:** `skills/review/SKILL.md` (931줄 → ≤700줄)

**6a. @ import 전환 (mid-workflow read 4개 제거):**

현재 mid-workflow read 지시 위치:
- Line 579: `references/validator-template.md를 사용하여` → validator-template은 이미 @ import 존재, 이 텍스트 지시는 @ import가 이미 로드했음을 의미하는 안내로 변경
- Line 763: `references/tracker-defer.md를 참조하여` → @ import로 자동 로드되므로 참조 텍스트만 `tracker-defer 프로토콜에 따라`로 변경
- Line 779: `references/walkthrough.md를 전체적으로 읽으십시오` → `walkthrough 프로토콜을 따르십시오`로 교체
- Line 781: `references/tracker-defer.md를 통해` → `tracker-defer 프로토콜을 통해`로 교체
- Line 791: `references/tracker-defer.md Interactive 모드를 통해` → `tracker-defer Interactive 모드를 통해`로 교체
- Line 799: `references/bulk-preview.md를 로드합니다` → `bulk-preview 프로토콜을 실행합니다`로 교체
- Line 774: `references/tracker-defer.md에 따라` → `tracker-defer 프로토콜에 따라`로 교체
- Line 802: `references/walkthrough.md에 정의된` → `walkthrough에 정의된`으로 교체

**6b. Gemini 섹션 압축 (lines 13-26 → 3줄):**
```
`--add gemini` (또는 `--add gem`) 플래그가 있으면: gem 도구로 Gemini에 초안 검토 요청, 결과 통합, 산출물 상단에 "Gemini와의 협업을 통해 검토 및 보완되었습니다." 추가.
```

**6c. `Base guidelines` → `기본 가이드라인` 교체**

**6d. 모드 섹션 중복 패턴 압축:**
- Interactive/Autofix/Headless/Report-only 각 모드에서 반복되는 "질문하지 않습니다", "커밋하지 않습니다" 등 중복 지시 통합

**6e. SKILL.md 하단 @ import 섹션에 4개 파일 추가:**
```
@./references/walkthrough.md
@./references/tracker-defer.md
@./references/bulk-preview.md
```
(validator-template은 이미 존재하지 않음 — 현재 @ import 목록 확인 필요)

**검증 기준 (Covers AE2, AE3):**
- 파일 700줄 이하
- `references/walkthrough.md를` 같은 파일 경로 지시 없음
- `references/tracker-defer.md를` 같은 파일 경로 지시 없음
- `references/bulk-preview.md를` 같은 파일 경로 지시 없음
- `기본 가이드라인` 존재
- Gemini 섹션 3줄 이하
- 하단 @ import에 walkthrough / tracker-defer / bulk-preview 존재
- Stage 1-6 shell 명령 블록 변경 없음
- 4가지 모드 핵심 계약 규칙 모두 존재

**테스트 시나리오:**
- [happy] wc -l ≤ 700
- [happy] `grep -n "references/walkthrough.md를"` 결과 없음
- [happy] `grep -n "references/tracker-defer.md를"` 결과 없음
- [happy] `grep -n "references/bulk-preview.md를"` 결과 없음
- [happy] `grep "기본 가이드라인"` 존재
- [happy] `grep "@./references/walkthrough.md"` 존재
- [happy] `grep "@./references/tracker-defer.md"` 존재
- [happy] `grep "@./references/bulk-preview.md"` 존재
- [edge] Stage 1-6 섹션 헤더 6개 모두 존재 (`Stage 1`, `Stage 2`, ... `Stage 6`)
- [edge] 4가지 모드(Interactive, Autofix, Headless, Report-only) 섹션 모두 존재

---

## Dependencies

```
U1, U2, U3, U4, U5 (병렬 가능, 파일 겹침 없음)
   ↓
U6 (SKILL.md 수정 — U1-U5 완료 후, @ import 대상 파일 확정 후 실행)
```

U1-U5는 서로 독립적인 파일을 수정하므로 병렬 실행 가능.
U6는 U1-U5 완료 후 실행 (@ import 섹션에 추가할 파일 이름이 확정되어야 함).

## Risks

| 위험 | 완화 |
|------|------|
| 신뢰도 루브릭 앵커 행동 기준 손실 | U1: 0/25/50/75/100 정의 + 핵심 행동 기준 1줄 유지 |
| walkthrough 적응형 조정 섹션 누락 | U2: adaptive adjustments 섹션 구조 보존 명시 |
| tracker-defer 폴백 체인 순서 손실 | U3: 3단계 체인 순서 + `no_sink` 동작 보존 명시 |
| @ import 추가 후 SKILL.md 컴파일 크기 증가 | U6에서 동시에 SKILL.md 본문 압축으로 상쇄 |
| mid-workflow read 제거 후 참조 모호 | @ import로 이미 로드되므로 텍스트 참조만 간소화 |
