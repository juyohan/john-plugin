---
title: "skills/brainstorm 스킬 파일 구조 개선"
date: 2026-05-13
status: completed
---

## 배경

`skills/brainstorm/`은 SKILL.md(256줄) + references/ 5개 파일(639줄) = 총 895줄로 구성되어 있다.
실행 중 외부 파일을 최대 5번 읽으며, 계층적 Phase 번호(0.1b, 2.5 등)와 4단계 티어(Lightweight/Standard/Deep/Deep-product)로 복잡하다.
`skills/SKILL.md`(71줄)의 구조 패턴(번호 섹션, 굵은 요약, 명령형 불릿, 자기완결)을 기준으로 단일 파일로 재작성한다.

## 결정 사항

| 결정 | 내용 | 근거 |
|------|------|------|
| 단일 파일 통합 | references/ 폴더 전체 삭제, 내용 SKILL.md에 인라인 | 실행 중 파일 읽기 0회로 줄임 |
| 3단계 티어 | Lightweight / Standard / Deep (Deep-product 제거) | Deep-product를 Deep 내 1줄 분기로 축소 |
| Gap 렌즈 압축 | 5개 이름 유지, 설명 각 1줄 | 이름이 의미를 충분히 전달 |
| Synthesis Summary | Stated / Inferred / Out 3-bucket, 3줄 인라인 | 173줄 파일 대체 |
| 구조 패턴 | `skills/SKILL.md` 패턴 준수: `## N. 이름` + **한 줄 요약** + 불릿 | 모든 skill 파일 간 일관성 |
| 목표 분량 | 150줄 이하 | 현재 895줄 → 6분의 1 이하로 압축 |

## 범위

**포함:**
- `skills/brainstorm/SKILL.md` — 재작성
- `skills/brainstorm/references/` — 폴더 전체 삭제 (5개 파일)

**제외:**
- `skills/SKILL.md` (base) — 수정 없음
- 다른 `skills/*/SKILL.md` 파일들
- `commands/` 디렉토리

## 구현 단위

### - U1. 참조 파일 핵심 내용 추출

**읽을 파일:** `skills/brainstorm/references/*.md` (5개)

각 파일에서 인라인할 핵심을 아래 단위로 추출한다:

| 파일 | 인라인 형태 |
|------|------------|
| `synthesis-summary.md` | Stated/Inferred/Out 정의 + 각 1줄 설명 |
| `requirements-capture.md` | 출력 경로 + 문서 섹션 목록 (불릿 8개 이내) |
| `handoff.md` | 다음 단계 옵션 5개 불릿 |
| `universal-brainstorming.md` | "소프트웨어가 아닌 경우" 1줄 분기 지시 |
| `visual-communication.md` | 필요 시 1줄 압축 또는 생략 |

**검증 기준:**
- 5가지 기능 영역(갭 테스트, 종합 요약, 핸드오프, 출력, 범용 분기)이 모두 추출됨
- 각 추출 결과가 3줄 이내

---

### - U2. SKILL.md 재작성

**수정할 파일:** `skills/brainstorm/SKILL.md`

`skills/SKILL.md` 구조 패턴을 따라 재작성한다.

**유지할 기능 목록:**
1. 1질문/턴 규칙 + 플랫폼 질문 도구 우선
2. 컨텍스트 스캔 (Standard/Deep)
3. 3단계 티어 분류 (Lightweight / Standard / Deep)
4. 5개 Gap 렌즈 (Evidence, Specificity, Counterfactual, Attachment, Durability)
5. 2~3가지 접근 방식 탐색
6. Synthesis Summary (Stated / Inferred / Out)
7. 요구사항 문서 출력 (`docs/brainstorms/`)
8. 핸드오프 옵션
9. `--add gemini` 다중 에이전트 플래그

**목표 섹션 구조:**
```
## 1. 상호작용 원칙
## 2. 범위 분류
## 3. 컨텍스트 스캔
## 4. Gap 압박 테스트
## 5. 접근 방식 탐색
## 6. Synthesis Summary
## 7. 요구사항 문서 출력
## 8. 핸드오프
```

**검증 기준:**
- 파일 150줄 이하
- `references/` 경로 참조 없음
- 모든 섹션이 `## N. 이름` + **한 줄 요약** + 불릿 패턴 준수
- `$ARGUMENTS` 자리표시자 포함
- 5개 Gap 렌즈 모두 포함 (각 1줄)

---

### - U3. references/ 폴더 삭제

**삭제할 파일:** `skills/brainstorm/references/` 전체 (5개 파일)

U2 완료 후 실행.

**검증 기준:**
- `skills/brainstorm/references/` 폴더 없음
- `skills/brainstorm/SKILL.md` 내 `references/` 경로 참조 없음

## 의존성

```
U1 → U2 → U3
```

U1 추출 결과를 U2 작성에 사용. U3은 U2 완료 후 실행.

## 위험 및 완화

| 위험 | 완화 |
|------|------|
| requirements-capture 포맷 세부사항 누락 | U1에서 문서 섹션 목록 명시적으로 추출 |
| Deep-product 기능 손실 | Deep 설명에 "제품 형상 미결 시 내구성 갭 추가" 명시 |
| 압축 후 브레인스토밍 품질 저하 | 재작성 후 실제 브레인스토밍 1회 수행으로 검증 |
