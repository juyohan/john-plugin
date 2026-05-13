# John Plugin — Claude Code Instructions

이 파일은 Claude Code가 자동으로 읽는 프로젝트 지시 파일입니다.
전체 워크플로우 가이드와 규칙은 **[AGENTS.md](./AGENTS.md)** 를 참조하십시오.

---

## 프로젝트 개요

CE(Compound Engineering) 워크플로우를 뼈대로 삼아 ECC(Everything Claude Code)의
스킬·룰·훅 인프라를 통합한 단일 Claude Code 플러그인.

## 핵심 워크플로우

```
/genie:brainstorm → /genie:plan → /genie:test → /genie:work
```

모든 기능 개발은 이 순서를 따릅니다. `/genie:plan` 완료 후 구현 전에 반드시 `/genie:test`로 테스트를 먼저 작성합니다. 자세한 내용은 AGENTS.md 섹션 1 참조.

## 스테이지 경계 규칙 (CRITICAL)

> **각 genie 커맨드는 해당 단계 완료 시 반드시 멈춥니다.**
> 다음 단계 실행 여부는 사용자가 결정합니다. 에이전트가 임의로 판단하지 않습니다.

### 절대 금지 행동

```
❌ /genie:brainstorm 완료 → /genie:plan 자동 실행
❌ /genie:plan 완료 → /genie:work 자동 실행
❌ /genie:work 완료 → /genie:review 자동 실행
❌ "다음 단계도 진행할까요?" 질문 후 사용자 응답 전 진행
❌ 사용자가 명시하지 않은 후속 단계를 현재 단계에서 선행 실행
```

### 각 단계 종료 방식 (반드시 이 순서)

1. 산출물 출력 — 문서/코드/결과물을 완전히 출력
2. 단계 완료 선언 — `[단계명] 완료.`
3. 다음 단계 안내 — 다음 커맨드를 한 줄로만 안내
4. 완전 정지 — 추가 작업 없이 사용자 입력 대기

```
✅ 올바른 종료: 산출물 출력 → "[brainstorm] 완료. 다음: /genie:plan" → 대기
❌ 잘못된 종료: 산출물 출력 → /genie:plan 즉시 실행
```

### 단계별 정지 기준

| 단계 | 산출물 | 정지 기준 |
|------|--------|----------|
| `/genie:think` | ideation.md | 아이디어 문서 저장 완료 후 |
| `/genie:brainstorm` | brainstorm.md | 요구사항 문서 저장 완료 후 |
| `/genie:plan` | plan.md | 구현 계획 문서 저장 완료 후 |
| `/genie:test` | 테스트 파일 | 실패하는 테스트(RED) 작성 완료 후 |
| `/genie:work` | 코드 변경 | 모든 테스트 통과(GREEN) 확인 후 |
| `/genie:review` | 리뷰 결과 | 리뷰 보고서 출력 완료 후 |
| `/genie:learn` | compound.md | 지식 자산화 문서 저장 완료 후 |

### 우선순위

스킬 내부의 "What's next" / "See Also" / 권장 다음 단계는 모두 **제안**입니다.
CLAUDE.md의 이 규칙이 스킬 내부 지시보다 항상 우선합니다.

## 저장소 문서 관례

Genie 워크플로우의 각 단계마다 산출물을 `docs/` 아래에 기록한다.
같은 작업이라면 `<제목>`을 단계 간 통일하여 추적 가능하게 한다.

`/genie:think → /genie:strategy → /genie:brainstorm`은 같은 정의(Define) 페이즈 — brainstorms 폴더에 함께 보관.

| 단계 | 경로 |
|------|------|
| `/genie:think` (선택) | `docs/brainstorms/YYYY/MM/DD-<제목>-ideation.md` |
| `/genie:strategy` (선택) | `docs/brainstorms/YYYY/MM/DD-<제목>-strategy.md` |
| `/genie:brainstorm` | `docs/brainstorms/YYYY/MM/DD-<제목>.md` ← 메인 |
| `/genie:plan` | `docs/plans/YYYY/MM/DD-<제목>.md` |
| `/genie:test` | `docs/tests/YYYY/MM/DD-<제목>.md` |
| `/genie:work` / `/genie:fix` / `/genie:optimize` | `docs/work/YYYY/MM/DD-<제목>.md` |
| `/genie:review` | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| `/genie:learn` | `docs/compounds/YYYY/MM/DD-<제목>.md` |

## 플러그인 구조

```
.claude-plugin/   — 플러그인 메타데이터 (name: "genie")
commands/         — Claude Code 커맨드 (/genie:brainstorm, /genie:plan 등)
skills/           — Genie 스킬 (brainstorm, plan, work 등)
scripts/hooks/    — ECC 훅 자동화 (GateGuard, observe-runner 등)
docs/             — 프로젝트 문서 (brainstorms, plans 등)
```

---

## 코딩 행동 원칙

> 과속보다 신중함을 우선합니다. 사소한 작업에는 판단을 사용하세요.

### 1. 먼저 생각하기

**가정하지 말 것. 혼란을 숨기지 말 것. 트레이드오프를 드러낼 것.**

구현 전에:
- 가정을 명시적으로 밝힌다. 불확실하면 질문한다.
- 여러 해석이 가능하면 모두 제시한다 — 조용히 선택하지 않는다.
- 더 단순한 방법이 있으면 말한다. 필요할 때 반론을 제기한다.
- 뭔가 불명확하면 멈춘다. 무엇이 혼란스러운지 명시하고 질문한다.

### 2. 단순함 우선

**문제를 푸는 최소한의 코드. 추측성 코드는 없다.**

- 요청받은 것 이상의 기능을 추가하지 않는다.
- 단일 사용 코드에 추상화를 만들지 않는다.
- 요청되지 않은 "유연성"이나 "설정 가능성"을 넣지 않는다.
- 불가능한 시나리오에 대한 에러 처리를 추가하지 않는다.
- 200줄로 쓰고 50줄로 될 것 같으면, 다시 쓴다.

자문하라: "시니어 엔지니어가 이걸 보고 과복잡하다고 할까?" — 그렇다면 단순화한다.

### 3. 외과적 변경

**필요한 것만 건드린다. 본인이 만든 것만 정리한다.**

기존 코드를 수정할 때:
- 인접한 코드, 주석, 포맷을 "개선"하지 않는다.
- 망가지지 않은 것을 리팩토링하지 않는다.
- 다르게 하고 싶어도 기존 스타일에 맞춘다.
- 관련 없는 죽은 코드를 발견하면 언급만 한다 — 삭제하지 않는다.

본인 변경이 고아를 만들 때:
- 내 변경으로 인해 사용되지 않게 된 import/변수/함수는 제거한다.
- 기존의 죽은 코드는 요청받지 않으면 제거하지 않는다.

기준: 변경된 모든 줄이 사용자 요청으로 직접 추적되어야 한다.

### 4. 목표 주도 실행

**성공 기준을 정의한다. 검증될 때까지 반복한다.**

작업을 검증 가능한 목표로 변환한다:
- "유효성 검사 추가" → "잘못된 입력에 대한 테스트 작성 후 통과"
- "버그 수정" → "버그를 재현하는 테스트 작성 후 통과"
- "X 리팩토링" → "전후 테스트가 모두 통과하는지 확인"

다단계 작업에는 간략한 계획을 먼저 밝힌다:
```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
3. [단계] → 검증: [확인 방법]
```

---

**이 원칙들이 작동하고 있다면:** diff에 불필요한 변경이 줄고, 과복잡으로 인한 재작성이 줄며, 실수 이후가 아닌 구현 이전에 명확화 질문이 나온다.
