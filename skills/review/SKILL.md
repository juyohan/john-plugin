---
name: review
description: "계층화된 페르소나 에이전트, 신뢰도 기반 필터링, 머지/중복 제거 파이프라인을 사용한 구조화된 코드 리뷰입니다. PR을 생성하기 전에 코드 변경 사항을 검토할 때 사용합니다."
argument-hint: "[현재 브랜치를 리뷰하려면 공백으로 두거나, PR 링크를 제공하세요]"
allowed-tools:
  - gem
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.


# 코드 리뷰 (Code Review)

## 다중 에이전트 협업 (Multi-Agent Collaboration)

사용자의 입력(`$ARGUMENTS`) 내에 `--add <ai-이름>` 형태의 플래그가 포함되어 있는지 확인하십시오. 
현재 지원되는 외부 AI 인터페이스는 `--add gemini` (또는 `--add gem`)입니다.

만약 해당 플래그가 감지되면, 작업을 단독으로 확정하지 말고 다음 절차를 따르십시오:
1. **의도 파악:** 플래그를 제외한 나머지 문자열을 실제 지시사항으로 간주합니다.
2. **초안 작성:** 본인(주 에이전트)의 지식과 코드베이스 컨텍스트를 바탕으로 작업의 초기 뼈대나 접근법을 생각합니다.
3. **MCP 협업 호출:** `gem` 도구를 호출하여 외부 Gemini 에이전트에게 조언이나 검토를 구합니다.
   - 호출 시 전달할 메시지 예시: "나는 현재 이 작업에 대한 초안을 세우고 있어. 내 초안은 [초안 요약]이야. 이 접근 방식의 기술적 타당성을 검토하고 누락된 에지 케이스나 더 나은 패턴을 조언해줄 수 있어?"
4. **결과 통합:** `gem` 도구가 반환한 피드백을 당신의 최종 결과물에 통합(Synthesis)합니다. 
5. **명시적 표시:** 최종 산출물의 상단 또는 설명 부분에 "이 결과물은 Gemini와의 협업을 통해 검토 및 보완되었습니다."라는 문구를 추가하십시오.

이 협업 절차를 염두에 두고 아래의 본래 스킬 워크플로우를 진행하십시오.


동적으로 선택된 리뷰어 페르소나를 사용하여 코드 변경 사항을 리뷰합니다. 구조화된 JSON을 반환하는 병렬 서브 에이전트를 실행한 후, 발견된 사항들을 단일 보고서로 머지하고 중복을 제거합니다.

## 사용 시점

- PR을 생성하기 전
- 반복적인 구현 중 작업을 완료한 후
- 코드 변경 사항에 대한 피드백이 필요할 때
- 독립적으로 호출 가능
- 더 큰 워크플로우 내에서 읽기 전용 또는 autofix 리뷰 단계로 실행 가능

## 인자 파싱 (Argument Parsing)

`$ARGUMENTS`에서 다음 선택적 토큰들을 파싱합니다. 인식된 각 토큰을 제거한 후 나머지를 PR 번호, GitHub URL 또는 브랜치 이름으로 해석합니다.

| 토큰 | 예시 | 효과 |
|-------|---------|--------|
| `mode:autofix` | `mode:autofix` | autofix 모드 선택 (아래 모드 감지 참조) |
| `mode:report-only` | `mode:report-only` | report-only 모드 선택 |
| `mode:headless` | `mode:headless` | 프로그래밍 방식 호출을 위한 headless 모드 선택 (아래 모드 감지 참조) |
| `base:<sha-or-ref>` | `base:abc1234` 또는 `base:origin/main` | 범위 감지 건너뛰기 — 이 값을 직접 diff 베이스로 사용 |
| `plan:<path>` | `plan:docs/plans/2026-03-25-001-feat-foo-plan.md` | 요구사항 검증을 위해 이 플랜을 로드 |

모든 토큰은 선택 사항입니다. 토큰이 있을수록 추론할 항목이 줄어듭니다. 토큰이 없으면 해당 단계의 기존 동작으로 폴백합니다.

**충돌하는 모드 플래그:** 인자에 여러 모드 토큰이 나타나면 작업을 중단하고 에이전트를 할당하지 않습니다. `mode:headless`가 충돌하는 토큰 중 하나인 경우, headless 에러 봉투를 출력합니다: `Review failed (headless mode). Reason: conflicting mode flags — <mode_a> and <mode_b> cannot be combined.` 그렇지 않으면 일반 형식을 출력합니다: `Review failed. Reason: conflicting mode flags — <mode_a> and <mode_b> cannot be combined.`

## 빠른 리뷰 단축 경로 (Quick Review Short-Circuit)

`$ARGUMENTS`가 사용자가 빠르거나 가벼운 코드 리뷰를 원함을 나타내는 경우, 멀티 에이전트 흐름을 할당하지 않습니다.

다른 작업을 수행하기 전에 **선택된 경로를 안내**합니다 (빠른 리뷰 vs 멀티 에이전트 리뷰).

프로그래밍 방식 호출자(`mode:autofix`, `mode:report-only`, 또는 `mode:headless`가 있는 경우)는 이 안내를 건너뜁니다. 오케스트레이터가 사용자 메시징을 관리합니다.

순서:

1. **도구의 내장 코드 리뷰를 실행합니다.** `$ARGUMENTS`에 인식된 토큰을 제외한 리뷰 대상(PR 번호, GitHub URL 또는 브랜치 이름)이 포함되어 있으면 해당 대상을 내장 도구에 전달합니다. 대상이 제공되지 않으면 인자 없이 명령을 실행하여 내장 도구가 현재 브랜치를 기본값으로 사용하게 합니다.
   - Claude Code인 경우, `/review` 도구를 실행하고 대상이 있으면 전달합니다 (예: `/review 123`, `/review <PR-URL>`, `/review <branch>`). 대상이 없으면 `/review`만 실행합니다.
   - Gemini인 경우, 확인된 대상(또는 제공되지 않은 경우 현재 브랜치)에 대해 빠른 코드 리뷰를 실행합니다.
   - 다른 모든 코딩 도구의 경우, 해당 도구의 구문에 맞춰 대상을 전달하여 내장 코드 리뷰 도구를 실행합니다.

   그 후 중단합니다. 멀티 에이전트 리뷰어 파이프라인을 할당하지 않습니다.

2. **예외 -- 내장 코드 리뷰가 없는 경우.** 현재 도구에 내장 코드 리뷰 명령이나 스킬이 없는 경우, 단축 경로를 실행하지 않습니다. 이 스킬의 나머지 부분에서 설명하는 전체 멀티 에이전트 리뷰(Tier 2)를 계속 진행합니다.

3. **프로그래밍 방식 호출자는 이 단축 경로를 우회합니다.** `mode:autofix`, `mode:report-only`, 또는 `mode:headless`가 있는 경우, 빠른 리뷰 의도를 무시하고 전체 멀티 에이전트 리뷰를 실행합니다. 가벼운 패스를 원하는 스킬 간 호출자는 이 단축 경로를 통하지 말고 `/review`(또는 해당 도구의 동등한 기능)를 직접 호출해야 합니다.

## 모드 감지 (Mode Detection)

| 모드 | 조건 | 동작 |
|------|------|----------|
| **Interactive** (기본값) | 모드 토큰 없음 | 리뷰, `safe_auto` 수정을 자동으로 적용, 발견 사항 제시, 제어된/수동 발견 사항에 대한 정책 결정 요청, 선택적으로 수정/푸시/PR 다음 단계로 진행 |
| **Autofix** | 인자에 `mode:autofix` 포함 | 사용자 상호작용 없음. 리뷰, 정책적으로 허용된 `safe_auto` 수정만 적용, 제한된 횟수로 재리뷰, 잔여 다운스트림 작업을 캡처하는 실행 결과물(artifact) 작성 |
| **Report-only** | 인자에 `mode:report-only` 포함 | 엄격한 읽기 전용. 리뷰 및 보고만 수행하며 수정, 결과물 생성, 커밋, 푸시 또는 PR 작업 없이 중단 |
| **Headless** | 인자에 `mode:headless` 포함 | 스킬 간 호출을 위한 프로그래밍 모드. `safe_auto` 수정을 조용히 적용(단일 패스), 나머지 모든 발견 사항을 구조화된 텍스트 출력으로 반환, 실행 결과물 작성, "Review complete" 신호 반환. 대화형 프롬프트 없음. |

### Autofix 모드 규칙

- **모든 사용자 질문을 건너뜁니다.** 범위가 설정되면 승인이나 설명을 위해 멈추지 않습니다.
- **`safe_auto -> review-fixer` 발견 사항만 적용합니다.** `gated_auto`, `manual`, `human`, `release` 작업은 미해결 상태로 둡니다.
- **실행 결과물(artifact)을 작성합니다.** `/tmp/compound-engineering/ce-code-review/<run-id>/` 아래에 발견 사항, 적용된 수정 사항, 잔여 실행 가능 작업 및 자문 출력을 요약하여 작성합니다. 오케스트레이터는 이 결과물을 읽어 잔여 `downstream-resolver` 발견 사항을 라우팅합니다. 스킬 자체는 autofix 모드에서 티켓을 생성하거나 사용자에게 프롬프트를 띄우지 않습니다.
- **압축된 잔여 실행 가능 작업(Residual Actionable Work) 요약을 반환합니다.** 각 잔여 `downstream-resolver` 발견 사항을 고정된 `#`, 심각도, file:line, 제목, `autofix_class`와 함께 나열합니다. 요약은 적용된 `safe_auto` 수정 사항 섹션과 잔여 비자동 발견 사항 섹션으로 나뉩니다. 잔여 섹션에서는 Stage 5의 고정된 `#`을 재사용하며 번호를 다시 매기지 않습니다. 실행 결과물 경로를 포함합니다. 호출자는 결과물을 파싱하지 않고 이 요약을 직접 읽습니다. 잔여 사항이 없으면 `Residual actionable work: none.`이라고 명시합니다.
- **커밋, 푸시 또는 PR 생성을 수행하지 않습니다.** 부모 워크플로우가 이러한 결정을 내립니다.

### Report-only 모드 규칙

- **모든 사용자 질문을 건너뜁니다.** diff 메타데이터가 부족하면 의도를 보수적으로 추론합니다.
- **파일을 수정하거나 작업을 외부화하지 않습니다.** `/tmp/compound-engineering/ce-code-review/<run-id>/`를 작성하지 않고, 티켓을 생성하지 않으며, 커밋, 푸시 또는 PR 작업을 수행하지 않습니다.
- **병렬 읽기 전용 검증에 안전합니다.** `mode:report-only`는 동일한 체크아웃에서 브라우저 테스트와 동시에 실행할 수 있는 유일한 모드입니다.
- **공유 체크아웃을 전환하지 않습니다.** 호출자가 명시적인 PR 또는 브랜치 대상을 전달하는 경우, `mode:report-only`는 격리된 체크아웃/worktree에서 실행되거나 `gh pr checkout` / `git checkout`을 실행하는 대신 중단해야 합니다.
- **동일한 체크아웃에서 수정 리뷰와 브라우저 테스트를 겹쳐서 실행하지 않습니다.** 수정이 필요한 경우 브라우저 테스트 후에 또는 격리된 체크아웃/worktree에서 수정 리뷰 단계를 실행하십시오.

### Headless 모드 규칙

- **모든 사용자 질문을 건너뜁니다.** 플랫폼의 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)나 기타 대화형 프롬프트를 사용하지 않습니다. diff 메타데이터가 부족하면 의도를 보수적으로 추론합니다.
- **결정 가능한 diff 범위가 필요합니다.** headless 모드에서 diff 범위를 결정할 수 없는 경우(사용자 상호작용 없이 브랜치, PR 또는 `base:` ref를 결정할 수 없는 경우), `Review failed (headless mode). Reason: no diff scope detected. Re-invoke with a branch name, PR number, or base:<ref>.`를 출력하고 에이전트를 할당하지 않고 중단합니다.
- **`safe_auto -> review-fixer` 발견 사항만 단일 패스로 적용합니다.** 제한된 횟수의 재리뷰 라운드를 수행하지 않습니다. `gated_auto`, `manual`, `human`, `release` 작업은 미해결 상태로 두고 구조화된 출력으로 반환합니다.
- **모든 비자동 발견 사항을 구조화된 텍스트 출력으로 반환합니다.** Stage 6의 headless 출력 봉투 형식을 사용하여 각 발견 사항의 심각도, `autofix_class`, owner, `requires_verification`, confidence, `pre_existing`, `suggested_fix`를 유지합니다. 디스크에 있는 리뷰어별 결과물 파일에서 상세 필드(`why_it_matters`, `evidence[]`)를 보강합니다.
- **실행 결과물(artifact)을 작성합니다.** `/tmp/compound-engineering/ce-code-review/<run-id>/` 아래에 발견 사항, 적용된 수정 사항 및 자문 출력을 요약하여 작성합니다. 구조화된 출력에 결과물 경로를 포함합니다.
- **티켓을 생성하거나 작업을 외부화하지 않습니다.** 호출자가 구조화된 발견 사항을 받아 직접 다운스트림 작업을 라우팅합니다.
- **공유 체크아웃을 전환하지 않습니다.** 호출자가 명시적인 PR 또는 브랜치 대상을 전달하는 경우, `mode:headless`는 격리된 체크아웃/worktree에서 실행되거나 `gh pr checkout` / `git checkout`을 실행하는 대신 중단해야 합니다. 중단 시 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.`를 출력합니다.
- **공유 체크아웃에서 동시 사용에 안전하지 않습니다.** `mode:report-only`와 달리 headless는 파일을 수정합니다 (`safe_auto` 수정 적용). 호출자는 동일한 체크아웃에서 다른 수정 작업과 headless를 동시에 실행해서는 안 됩니다.
- **커밋, 푸시 또는 PR 생성을 수행하지 않습니다.** 호출자가 이러한 결정을 내립니다.
- **터미널 신호로 "Review complete"를 출력하며 종료합니다.** 호출자가 완료를 감지할 수 있도록 합니다. 모든 리뷰어가 실패하거나 타임아웃되면 `Code review degraded (headless mode). Reason: 0 of N reviewers returned results.`를 출력한 후 "Review complete"를 출력합니다.

### Interactive 모드 규칙

- **질문이 시작되기 전에 플랫폼 질문 도구를 미리 로드합니다.** Claude Code에서 `AskUserQuestion`은 지연 로드되는 도구이므로 세션 시작 시 스키마를 사용할 수 없습니다. Interactive 모드 작업 시작 시(Stage 2 의도 모호성 질문, After-Review 라우팅 질문, 발견 사항별 설명 질문, 벌크 프리뷰 승인/취소, `tracker-defer` 실패 하위 질문 전), `ToolSearch`를 호출하여 `select:AskUserQuestion`으로 스키마를 로드합니다. Interactive 흐름 최상단에서 **한 번 미리 로드**하십시오. 첫 질문 시점까지 기다리거나 사이트별로 결정하지 마십시오. Codex, Gemini, Pi에서는 이 단계가 적용되지 않습니다.
- **번호가 매겨진 리스트 폴백은 도구에 차단 질문 도구가 실제로 없을 때만 적용됩니다.** `ToolSearch`가 일치하는 도구를 찾지 못하거나, 도구 호출이 명시적으로 실패하거나, 런타임 모드에서 이를 노출하지 않는 경우(예: `request_user_input`을 사용할 수 없는 Codex 편집 모드)입니다. 스키마 로드 대기 중인 상태는 폴백 트리거가 아닙니다. 위 규칙에 따라 먼저 `ToolSearch`를 호출하십시오. 도구 호출이 번거롭거나, 모델이 보고서 형식 모드이거나, 지침이 긴 스킬에 묻혀 있다는 이유로 질문을 서술형 텍스트로 렌더링하는 것은 버그입니다. 사용자 결정이 필요한 질문은 도구를 호출하거나 명확하게 폴백해야 합니다.

## 심각도 척도 (Severity Scale)

모든 리뷰어는 P0-P3를 사용합니다:

| 레벨 | 의미 | 조치 |
|-------|---------|--------|
| **P0** | 치명적인 파손, 악용 가능한 취약점, 데이터 손실/손상 | 머지 전 반드시 수정 |
| **P1** | 일반적인 사용 시 발생 가능성이 높은 영향력 큰 결함, 계약 위반 | 수정 권장 |
| **P2** | 의미 있는 부작용이 있는 보통 수준의 문제 (엣지 케이스, 성능 저하, 유지보수 함정) | 간단한 경우 수정 |
| **P3** | 영향력이 낮고 범위가 좁으며 사소한 개선 사항 | 사용자 재량 |

## 작업 라우팅 (Action Routing)

심각도는 **긴급성**을 나타냅니다. 라우팅은 **누가 다음에 행동할지**와 **이 스킬이 체크아웃을 수정할 수 있는지**를 나타냅니다.

| `autofix_class` | 기본 소유자 (owner) | 의미 |
|-----------------|---------------|---------|
| `safe_auto` | `review-fixer` | 현재 모드가 수정을 허용할 때 스킬 내 수정 도구에 적합한 로컬 및 결정론적 수정 사항 |
| `gated_auto` | `downstream-resolver` 또는 `human` | 구체적인 수정 사항이 존재하지만, 동작, 계약, 권한 또는 기타 민감한 경계를 변경하므로 기본적으로 자동 적용해서는 안 되는 사항 |
| `manual` | `downstream-resolver` 또는 `human` | 스킬 내에서 수정하기보다 외부로 전달해야 하는 실행 가능한 작업 |
| `advisory` | `human` or `release` | 학습 내용, 배포 노트 또는 잔여 위험과 같은 보고 전용 출력 |

라우팅 규칙:

- **최종 경로는 Synthesis 단계에서 결정합니다.** 페르소나가 제공한 라우팅 메타데이터는 입력값일 뿐 최종 결정이 아닙니다.
- **의견이 일치하지 않을 때 더 보수적인 경로를 선택합니다.** 병합된 발견 사항은 `safe_auto`에서 `gated_auto` 또는 `manual`로 이동할 수 있지만, 강력한 근거 없이는 반대로 이동할 수 없습니다.
- **`safe_auto -> review-fixer`만 스킬 내 수정 큐에 자동으로 들어갑니다.**
- **`requires_verification: true`는 타겟 테스트, 집중 재리뷰 또는 운영 검증 없이는 수정이 완료되지 않음을 의미합니다.**

## 리뷰어 (Reviewers)

계층화된 조건에 따른 18명의 리뷰어 페르소나와 CE 전용 에이전트가 있습니다. 전체 카탈로그는 아래에 포함된 페르소나 카탈로그를 참조하십시오.

**항상 활성화 (모든 리뷰):**

| 에이전트 | 중점 사항 |
|-------|-------|
| `ce-correctness-reviewer` | 로직 에러, 엣지 케이스, 상태 버그, 에러 전파 |
| `ce-testing-reviewer` | 테스트 커버리지 공백, 약한 단언문, 취약한 테스트 |
| `ce-maintainability-reviewer` | 결합도, 복잡성, 네이밍, 데드 코드, 추상화 부채 |
| `ce-project-standards-reviewer` | CLAUDE.md 및 AGENTS.md 준수 여부 -- frontmatter, 참조, 네이밍, 이식성 |
| `ce-agent-native-reviewer` | Verify new features are agent-accessible |
| `ce-learnings-researcher` | 이 PR과 관련된 과거 이슈를 `docs/solutions/`에서 검색 |

**교차 조건부 (diff에 따라 선택):**

| 에이전트 | 선택 조건: diff가 다음을 포함할 때... |
|-------|---------------------------|
| `ce-security-reviewer` | 인증, 공용 엔드포인트, 사용자 입력, 권한 |
| `ce-performance-reviewer` | DB 쿼리, 데이터 변환, 캐싱, 비동기 |
| `ce-api-contract-reviewer` | 라우트, 직렬화 도구, 타입 시그니처, 버저닝 |
| `ce-data-migrations-reviewer` | 마이그레이션, 스키마 변경, 백필 |
| `ce-reliability-reviewer` | 에러 핸들링, 재시도, 타임아웃, 백그라운드 작업 |
| `ce-adversarial-reviewer` | 테스트/생성/lock파일 제외 변경 줄 수 50줄 이상, 또는 인증, 결제, 데이터 수정, 외부 API |
| `ce-previous-comments-reviewer` | 기존 리뷰 코멘트나 스레드가 있는 PR을 리뷰할 때 |

**스택 전용 조건부 (diff에 따라 선택):**

| 에이전트 | 선택 조건: diff가 다음을 포함할 때... |
|-------|---------------------------|
| `ce-dhh-rails-reviewer` | Rails 아키텍처, 서비스 객체, 세션/인증 선택, 또는 Hotwire-vs-SPA boundaries |
| `ce-kieran-rails-reviewer` | 컨벤션, 네이밍, 유지보수성이 중요한 Rails 애플리케이션 코드 |
| `ce-kieran-python-reviewer` | Python 모듈, 엔드포인트, 스크립트 또는 서비스 |
| `ce-kieran-typescript-reviewer` | TypeScript 컴포넌트, 서비스, 훅, 유틸리티 또는 공유 타입 |
| `ce-julik-frontend-races-reviewer` | Stimulus/Turbo 컨트롤러, DOM 이벤트, 타이머, 애니메이션 또는 비동기 UI 흐름 |
| `ce-swift-ios-reviewer` | Swift 파일, SwiftUI 뷰, UIKit 컨트롤러, 권한, 프라이버시 매니페스트, Core Data 모델, SPM 매니페스트, 스토리보드/XIB, 또는 .pbxproj의 빌드 설정/타겟/서명 변경 |

**CE 조건부 (마이그레이션 전용):**

| 에이전트 | 선택 조건: diff가 마이그레이션 파일을 포함할 때 |
|-------|------------------------------------------|
| `ce-schema-drift-detector` | `schema.rb`를 포함된 마이그레이션과 교차 참조 |
| `ce-deployment-verification-agent` | SQL 검증 쿼리가 포함된 배포 체크리스트 생성 |

## 리뷰 범위 (Review Scope)

모든 리뷰는 4명의 '항상 활성화' 페르소나와 2명의 CE '항상 활성화' 에이전트를 할당하며, diff에 맞는 교차 조건부 및 스택 전용 페르소나를 추가합니다. 모델이 크기를 적절히 조정합니다. 작은 설정 변경은 0개의 조건부 = 6명의 리뷰어를 트리거합니다. Rails 인증 기능은 security + reliability + kieran-rails + dhh-rails = 10명의 리뷰어를 트리거할 수 있습니다.

## 보호된 결과물 (Protected Artifacts)

다음 경로들은 `compound-engineering` 파이프라인의 결과물이므로 어떤 리뷰어도 삭제, 제거 또는 gitignore 대상으로 플래그를 지정해서는 안 됩니다.

- `docs/brainstorms/**/*` -- `ce-brainstorm`에 의해 생성된 요구사항 문서
- `docs/plans/**/*.md` -- `ce-plan`에 의해 생성된 플랜 파일 (의사결정 결과물이며, 실행 진행률은 플랜 본문에 저장되지 않고 git에서 도출됨)
- `docs/solutions/*.md` -- 파이프라인 도중 생성된 솔루션 문서

리뷰어가 이 디렉토리의 파일을 정리 또는 제거 대상으로 지정하면 Synthesis 단계에서 해당 발견 사항을 폐기하십시오.

## 실행 방법

### Stage 1: 범위 결정 (Determine scope)

diff 범위, 파일 목록 및 diff를 계산합니다. 가능한 한 적은 명령으로 결합하여 권한 요청을 최소화합니다.

**`base:` 인자가 제공된 경우 (빠른 경로):**

호출자가 이미 diff 베이스를 알고 있습니다. 모든 베이스 브랜치 감지, 원격 확인 및 머지 베이스 계산을 건너뜁니다. 제공된 값을 직접 사용합니다.

```
BASE_ARG="{base_arg}"
BASE=$(git merge-base HEAD "$BASE_ARG" 2>/dev/null) || BASE="$BASE_ARG"
```

그 후 다른 경로와 동일한 출력을 생성합니다.

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

이 경로는 SHA, `origin/main`, 브랜치 이름 등 어떤 ref와도 작동합니다. 자동화된 호출자(`ce-work`, `lfg`, `slfg`)는 감지 오버헤드를 피하기 위해 이 방식을 선호해야 합니다. **`base:`를 PR 번호나 브랜치 대상과 결합하지 마십시오.** 둘 다 있으면 에러를 발생시키고 중단합니다: "Cannot use `base:` with a PR number or branch target — `base:` implies the current checkout is already the correct branch. Pass `base:` alone, or pass the target alone and let scope detection resolve the base." 이는 diff 베이스는 한 소스에서 오고 코드와 메타데이터는 다른 소스에서 오는 범위/의도 불일치를 방지합니다.

**PR 번호 또는 GitHub URL이 인자로 제공된 경우:**

`mode:report-only` 또는 `mode:headless`가 활성화된 경우, 공유 체크아웃에서 `gh pr checkout <number-or-url>`을 실행하지 **마십시오**. `mode:report-only`의 경우 호출자에게 알립니다: "mode:report-only cannot switch the shared checkout to review a PR target. Run it from an isolated worktree/checkout for that PR, or run report-only with no target argument on the already checked out branch." `mode:headless`의 경우 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.`를 출력합니다. 격리된 체크아웃에서 실행 중이지 않다면 여기서 중단합니다.

**건너뛰기 조건 사전 확인.** 체크아웃 또는 범위 감지 전에 PR 상태 조사를 실행하여 리뷰 진행 여부를 결정합니다.

```
gh pr view <number-or-url> --json state,title,body,files
```

건너뛰기 규칙을 순서대로 적용합니다:

- `state`가 `CLOSED` 또는 `MERGED`인 경우 -> `PR is closed/merged; not reviewing.` 메시지와 함께 중단
- **사소한 PR 판단 (Trivial-PR judgment)**: 가벼운 서브 에이전트(Claude Code의 경우 `haiku`, Codex의 경우 `gpt-5.4-nano` 등)를 PR 제목, 본문 및 변경된 파일 경로와 함께 할당합니다. 에이전트의 작업: "코드 리뷰가 필요하지 않은 자동화된 또는 사소한 PR입니까? 예: 종속성 lock 파일 또는 매니페스트만 업데이트, 자동 배포 커밋, 실질적인 코드 변경 없는 버전 증가. 의심스러우면 '아니오'라고 답하십시오. 잘못 건너뛰는 비용이 불필요한 리뷰를 수행하는 비용보다 큽니다." 판단 결과가 '예'이면 `PR appears to be a trivial automated PR; not reviewing. Run without a PR argument to review the current branch, or pass base:<ref> if review is intended.` 메시지와 함께 중단합니다.

건너뛰기 규칙이 발동하면 리뷰어를 할당하거나 체크아웃을 전환하거나 범위 감지를 수행하지 않고 메시지를 출력한 후 중단합니다. **독립적인 브랜치 모드와 `base:` 모드는 영향을 받지 않으며** 항상 전체 리뷰를 실행합니다. **Draft PR은 정상적으로 리뷰합니다.** Draft 상태는 건너뛰기 조건이 아니며 진행 중인 작업에 대한 조기 피드백은 가치가 있습니다.

건너뛰기 규칙이 발동하지 않으면 아래 체크아웃 로직을 진행합니다.

먼저 브랜치를 전환하기 전에 worktree가 깨끗한지 확인합니다.

```
git status --porcelain
```

출력이 비어 있지 않으면 사용자에게 알립니다: "You have uncommitted changes on the current branch. Stash or commit them before reviewing a PR, or use standalone mode (no argument) to review the current branch as-is." worktree가 깨끗해질 때까지 체크아웃을 진행하지 마십시오.

그 후 페르소나 에이전트가 실제 코드를 읽을 수 있도록 PR 브랜치를 체크아웃합니다.

```
gh pr checkout <number-or-url>
```

그 후 PR 메타데이터를 가져옵니다. 베이스 브랜치 이름뿐만 아니라 PR 베이스 레포지토리 식별자를 캡처합니다. `--jq`를 사용하여 리뷰와 코멘트를 `hasPriorComments` 불리언 값으로 투영합니다. 이때 리뷰 본문이나 코멘트 본물을 오케스트레이터의 컨텍스트로 가져오지 않고 개수만 확인합니다. 리뷰 필터는 본문이 비어 있는 승인 상태 제출을 제외합니다 (승인은 검증할 피드백이 아님). 따라서 승인 클릭만 있는 PR은 이 게이트를 통과합니다. Stage 3는 `hasPriorComments`를 사용하여 `previous-comments` 에이전트 할당 여부를 결정합니다.

```
gh pr view <number-or-url> --json title,body,baseRefName,headRefName,url,reviews,comments --jq '{title, body, baseRefName, headRefName, url, hasPriorComments: ((.reviews | map(select(.state != "APPROVED" or .body != "")) | length) > 0 or (.comments | length) > 0)}'
```

반환된 PR URL에서 레포지토리 부분(예: `https://github.com/juyohan/compound-engineering-plugin/pull/348`에서 `juyohan/compound-engineering-plugin`)을 `<base-repo>`로 사용합니다.

그 후 로컬 diff를 PR의 베이스 브랜치와 비교하여 계산함으로써 로컬 수정 커밋과 커밋되지 않은 편집 사항도 재리뷰에 포함되도록 합니다. 메타데이터의 PR 베이스 브랜치(여기서는 `<base>`)와 PR URL에서 파생된 PR 베이스 레포지토리 식별자(여기서는 `<base-repo>`)를 대입합니다. `origin`이 해당 레포를 가리킨다고 가정하지 말고 PR의 실제 베이스 레포지토리에서 base ref를 확인합니다.

```
PR_BASE_REMOTE=$(git remote -v | awk 'index($2, "github.com:<base-repo>") || index($2, "github.com/<base-repo>") {print $1; exit}')
if [ -n "$PR_BASE_REMOTE" ]; then PR_BASE_REMOTE_REF="$PR_BASE_REMOTE/<base>"; else PR_BASE_REMOTE_REF=""; fi
PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
if [ -z "$PR_BASE_REF" ]; then
  if [ -n "$PR_BASE_REMOTE_REF" ]; then
    git fetch --no-tags "$PR_BASE_REMOTE" <base>:refs/remotes/"$PR_BASE_REMOTE"/<base> 2>/dev/null || git fetch --no-tags "$PR_BASE_REMOTE" <base> 2>/dev/null || true
    PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
  else
    if git fetch --no-tags https://github.com/<base-repo>.git <base> 2>/dev/null; then
      PR_BASE_REF=$(git rev-parse --verify FETCH_HEAD 2>/dev/null || true)
    fi
    if [ -z "$PR_BASE_REF" ]; then PR_BASE_REF=$(git rev-parse --verify <base> 2>/dev/null || true); fi
  fi
fi
if [ -n "$PR_BASE_REF" ]; then BASE=$(git merge-base HEAD "$PR_BASE_REF" 2>/dev/null) || BASE=""; else BASE=""; fi
```

```
if [ -n "$BASE" ]; then echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard; else echo "ERROR: Unable to resolve PR base branch <base> locally. Fetch the base branch and rerun so the review scope stays aligned with the PR."; fi
```

`gh pr view`에서 PR 제목/본문, 베이스 브랜치, PR URL을 추출하고 로컬 명령에서 베이스 마커, 파일 목록, diff 내용, `UNTRACKED:` 목록을 추출합니다. 체크아웃 후 리뷰 범위로 `gh pr diff`를 사용하지 마십시오. 이는 원격 PR 상태만 반영하며 로컬 수정 커밋을 누락시킵니다. fetch 시도 후에도 실제 베이스 레포지토리에서 base ref를 확인할 수 없으면 `git diff HEAD`로 폴백하지 말고 중단하십시오. 베이스 브랜치 없는 PR 리뷰는 불완전합니다.

**브랜치 이름이 인자로 제공된 경우:**

지정된 브랜치를 체크아웃한 후 베이스 브랜치와 diff를 비교합니다. 제공된 브랜치 이름(여기서는 `<branch>`)을 대입합니다.

`mode:report-only` 또는 `mode:headless`가 활성화된 경우, 공유 체크아웃에서 `git checkout <branch>`를 실행하지 **마십시오**. `mode:report-only`의 경우 호출자에게 알립니다: "mode:report-only cannot switch the shared checkout to review another branch. Run it from an isolated worktree/checkout for `<branch>`, or run report-only on the current checkout with no target argument." `mode:headless`의 경우 `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref> to review the current checkout, or run from an isolated worktree.`를 출력합니다. 격리된 체크아웃에서 실행 중이지 않다면 여기서 중단합니다.

먼저 브랜치를 전환하기 전에 worktree가 깨끗한지 확인합니다.

```
git status --porcelain
```

출력이 비어 있지 않으면 사용자에게 알립니다: "You have uncommitted changes on the current branch. Stash or commit them before reviewing another branch, or provide a PR number instead." worktree가 깨끗해질 때까지 체크아웃을 진행하지 마십시오.

```
git checkout <branch>
```

그 후 리뷰 베이스 브랜치를 감지하고 merge-base를 계산합니다. `scripts/resolve-base.sh` 스크립트를 실행합니다. 이 스크립트는 다중 폴백 감지(PR 메타데이터 -> `origin/HEAD` -> `gh repo view` -> common branch names)를 통해 포크에 안전한 원격 해결을 처리합니다.

```
RESOLVE_OUT=$(bash scripts/resolve-base.sh) || { echo "ERROR: resolve-base.sh failed"; exit 1; }
if [ -z "$RESOLVE_OUT" ] || echo "$RESOLVE_OUT" | grep -q '^ERROR:'; then echo "${RESOLVE_OUT:-ERROR: resolve-base.sh produced no output}"; exit 1; fi
BASE=$(echo "$RESOLVE_OUT" | sed 's/^BASE://')
```

스크립트가 에러를 출력하면 `git diff HEAD`로 폴백하지 말고 중단하십시오. 베이스 브랜치 없는 브랜치 리뷰는 커밋되지 않은 변경 사항만 보여줄 뿐 브랜치의 모든 커밋된 작업을 누락시킵니다.

성공 시 diff를 생성합니다.

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

여전히 `gh pr view`를 통해 PR 제목, 본문, 연결된 이슈 및 투영된 `hasPriorComments` 불리언 값을 가져올 수 있습니다 (PR 모드와 동일한 `--jq` 형식을 사용하여 승인 전용 리뷰를 무시하고 일관성을 유지함). PR이 없어도 실패하지 말고 `hasPriorComments=false`로 둡니다.

**인자가 없는 경우 (현재 브랜치에서 독립형 실행):**

브랜치 모드와 동일한 `scripts/resolve-base.sh` 스크립트를 사용하여 리뷰 베이스 브랜치를 감지하고 merge-base를 계산합니다.

```
RESOLVE_OUT=$(bash scripts/resolve-base.sh) || { echo "ERROR: resolve-base.sh failed"; exit 1; }
if [ -z "$RESOLVE_OUT" ] || echo "$RESOLVE_OUT" | grep -q '^ERROR:'; then echo "${RESOLVE_OUT:-ERROR: resolve-base.sh produced no output}"; exit 1; fi
BASE=$(echo "$RESOLVE_OUT" | sed 's/^BASE://')
```

스크립트가 에러를 출력하면 `git diff HEAD`로 폴백하지 말고 중단하십시오. 베이스 브랜치 없는 독립형 리뷰는 커밋되지 않은 변경 사항만 보여줄 뿐 브랜치의 모든 커밋된 작업을 누락시킵니다.

성공 시 diff를 생성합니다.

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

(`..HEAD` 없이) `git diff $BASE`를 사용하면 merge-base와 작업 트리를 비교하며, 여기에는 커밋된 변경 사항, 스테이징된 변경 사항 및 스테이징되지 않은 변경 사항이 모두 포함됩니다.

**추적되지 않은 파일 처리 (Untracked file handling):** `FILES:`/`DIFF:`가 비어 있지 않더라도 항상 `UNTRACKED:` 목록을 검사합니다. 추적되지 않은 파일은 스테이징되기 전까지 리뷰 범위 밖입니다. 목록이 비어 있지 않으면 사용자에게 어떤 파일이 제외되었는지 알립니다. 검토해야 할 파일이 있다면 중단하고 사용자에게 먼저 `git add`를 수행한 후 다시 실행하도록 알립니다. 사용자가 의도적으로 추적된 변경 사항만 리뷰하려는 경우에만 계속 진행합니다. `mode:headless` 또는 `mode:autofix`에서는 멈춰서 묻지 않고 추적된 변경 사항만으로 진행하며 출력의 Coverage 섹션에 제외된 추적되지 않은 파일들을 기록합니다.

### Stage 2: 의도 파악 (Intent discovery)

변경 사항이 무엇을 달성하려는지 이해합니다. 의도 파악 소스는 Stage 1의 경로에 따라 달라집니다.

**PR/URL 모드:** `gh pr view` 메타데이터의 PR 제목, 본문 및 연결된 이슈를 사용합니다. 본문이 빈약한 경우 PR의 커밋 메시지로 보강합니다.

**브랜치 모드:** Stage 1에서 확인된 merge-base를 사용하여 `git log --oneline ${BASE}..<branch>`를 실행합니다.

**독립형 (현재 브랜치):** 다음을 실행합니다.

```
echo "BRANCH:" && git rev-parse --abbrev-ref HEAD && echo "COMMITS:" && git log --oneline ${BASE}..HEAD
```

대화 컨텍스트(플랜 섹션 요약, PR 설명)와 결합하여 2~3줄의 의도 요약을 작성합니다.

```
Intent: Simplify tax calculation by replacing the multi-tier rate lookup
with a flat-rate computation. Must not regress edge cases in tax-exempt handling.
```

이를 모든 리뷰어의 할당 프롬프트에 전달합니다. 의도는 어떤 리뷰어를 선택할지가 아니라 *각 리뷰어가 얼마나 꼼꼼히 살펴볼지*를 결정합니다.

**의도가 모호할 때:**

- **Interactive 모드:** 플랫폼의 차단 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 한 가지 질문을 던집니다: "이 변경 사항의 주요 목표는 무엇입니까?" 의도가 설정될 때까지 리뷰어를 할당하지 마십시오. **Claude Code 전용:** `AskUserQuestion`이 이번 세션에서 아직 로드되지 않은 경우(Interactive 모드 규칙의 사전 로드 참조), 먼저 `ToolSearch`를 호출하여 로드한 후 질문하십시오. 도구에 차단 도구가 실제로 없거나 호출 에러가 발생하는 경우에만 채팅에 번호가 매겨진 옵션으로 폴백하십시오. 스키마 로드가 필요하다는 이유로 폴백하지 마십시오. 질문을 조용히 건너뛰지 마십시오.
- **Autofix/report-only/headless 모드:** 브랜치 이름, diff, PR 메타데이터 및 호출자 컨텍스트에서 의도를 보수적으로 추론합니다. 차단하는 대신 Coverage 또는 Verdict 근거에 불확실성을 기록합니다.

### Stage 2b: 플랜 탐색 (Plan discovery)

Stage 6에서 요구사항 완료 여부를 검증할 수 있도록 플랜 문서를 찾습니다. 다음 소스들을 우선순위에 따라 확인하며, 첫 번째 발견 시 멈춥니다.

1. **`plan:` 인자.** 호출자가 플랜 경로를 전달한 경우 이를 직접 사용합니다. 파일이 존재하는지 읽어봅니다.
2. **PR 본문.** Stage 1에서 PR 메타데이터를 가져온 경우 본문에서 `docs/plans/**/*.md` 패턴과 일치하는 경로를 스캔합니다. 정확히 하나만 발견되고 파일이 존재하면 이를 `plan_source: explicit`으로 사용합니다. 여러 플랜 경로가 나타나면 모호한 것으로 간주하여, 디스크에 존재하고 PR 제목/의도와 명확히 관련된 최신 항목을 `plan_source: inferred`로 격하시키거나 생략합니다. PR 설명에 오래되거나 복사된 플랜 링크가 있는 경우가 많으므로 선택된 파일이 실제로 존재하는지 항상 확인하십시오.
3. **자동 탐색 (Auto-discover).** 브랜치 이름에서 2~3개의 키워드를 추출합니다 (예: `feat/onboarding-skill` -> `onboarding`, `skill`). `docs/plans/**/*`를 glob으로 검색하고 해당 키워드가 포함된 파일 이름을 필터링합니다. 정확히 하나만 일치하면 이를 사용합니다. 여러 개가 일치하거나 일치 항목이 모호해 보이면(예: 많은 플랜에 걸릴 수 있는 `review`, `fix`, `update` 같은 일반적인 키워드) 자동 탐색을 **건너뜁니다**. 잘못된 플랜은 플랜이 없는 것보다 나쁩니다. 일치 항목이 없으면 건너뜁니다.

**신뢰도 태깅 (Confidence tagging):** 플랜을 찾은 방법을 기록합니다.
- `plan:` 인자 -> `plan_source: explicit` (높은 신뢰도)
- 단일하고 명확한 PR 본문 일치 -> `plan_source: explicit` (높은 신뢰도)
- 다중/모호한 PR 본문 일치 -> `plan_source: inferred` (낮은 신뢰도)
- 단일하고 명확한 자동 탐색 일치 -> `plan_source: inferred` (낮은 신뢰도)

플랜을 찾으면 해당 플랜의 **요구사항(Requirements)** 섹션(현재 플랜의 `## Requirements`, 레거시 플랜의 `## Requirements Trace`)과 나열된 R-ID(R1, R2 등), 그리고 **구현 단위(Implementation Units)** (현재 플랜의 `### U1.`, `### U2.` 또는 `## Implementation Units` 아래의 `### Unit 1:`, 레거시 플랜의 해당 섹션 아래 불릿 또는 체크박스 항목)를 읽습니다. 추출된 요구사항 목록과 `plan_source`를 Stage 6를 위해 저장합니다. 플랜을 찾지 못해도 리뷰를 중단하지 마십시오. 요구사항 검증은 보조적인 작업이며 필수 사항이 아닙니다.

### Stage 3: 리뷰어 선택 (Select reviewers)

Stage 1의 diff와 파일 목록을 읽습니다. 4명의 '항상 활성화' 페르소나와 2명의 CE '항상 활성화' 에이전트는 자동으로 선택됩니다. 아래 포함된 페르소나 카탈로그의 각 교차 조건부 및 스택 전용 페르소나에 대해 diff가 이를 필요로 하는지 결정합니다. 이는 키워드 매칭이 아니라 에이전트의 판단입니다.

**조건부 선택을 위한 파일 타입 인지:** 지침 산문 파일(Markdown 스킬 정의, JSON 스키마, 설정 파일)은 제품 코드이지만 런타임 중심의 리뷰어로부터 큰 이점을 얻지 못합니다. Adversarial 리뷰어의 기법(레이스 컨디션, 연쇄 실패, 남용 사례)은 실행 가능한 코드 동작을 대상으로 합니다. 지침 산문 파일만 변경하는 diff의 경우, 해당 산문이 인증, 결제 또는 데이터 수정 동작을 설명하지 않는 한 Adversarial 리뷰어를 건너뜁니다. 줄 수 임계값 계산 시 실행 가능한 코드 줄만 계산합니다.

**`previous-comments`는 PR 전용이며 코멘트가 있을 때만 선택됩니다.** 다음 두 조건이 모두 충족될 때만 이 페르소나를 선택하십시오.

1. Stage 1에서 PR 메타데이터를 수집함 (PR 번호 또는 URL이 인자로 제공되었거나 `gh pr view`가 현재 브랜치에 대한 메타데이터를 반환함).
2. Stage 1의 `hasPriorComments`가 true임 (PR에 최소 하나의 리뷰 제출 또는 이슈 코멘트가 있음).

연결된 PR이 없는 독립형 브랜치 리뷰의 경우 건너뛰고, 아직 피드백이 없는 PR의 경우에도 건너뜁니다. 검증할 피드백이 없으며, 빈 결과를 반환하는 서브 에이전트를 할당하는 것조차 할당 오버헤드(페르소나 명세, diff, 스키마, 자체 gh 호출)를 발생시키기 때문입니다.

스택 전용 페르소나는 중복 선택될 수 있습니다. Rails UI 변경은 `kieran-rails`와 `julik-frontend-races`를 모두 필요로 할 수 있으며, TypeScript API diff는 `kieran-typescript`, `api-contract`, `reliability`를 모두 필요로 할 수 있습니다.

CE 조건부 에이전트의 경우 diff에 `db/migrate/*.rb`, `db/schema.rb` 또는 데이터 백필 스크립트가 포함되어 있는지 확인합니다.

에이전트 할당 전 팀 구성을 안내합니다.

```
Review team:
- correctness (always)
- testing (always)
- maintainability (always)
- project-standards (always)
- ce-agent-native-reviewer (always)
- ce-learnings-researcher (always)
- security -- new endpoint in routes.rb accepts user-provided redirect URL
- kieran-rails -- controller and Turbo flow changed in app/controllers and app/views
- dhh-rails -- diff adds service objects around ordinary Rails CRUD
- data-migrations -- adds migration 20260303_add_index_to_orders
- ce-schema-drift-detector -- migration files present
```

이는 진행 상황 보고일 뿐 차단 확인 단계가 아닙니다.

### Stage 3b: 프로젝트 표준 경로 탐색 (Discover project standards paths)

서브 에이전트를 할당하기 전에 `project-standards` 페르소나와 관련된 모든 표준 파일 경로(내용 아님)를 찾습니다. 기본 파일 검색/glob 도구를 사용하십시오.

1. 기본 파일 검색 도구(예: Claude Code의 Glob)를 사용하여 레포지토리 내의 모든 `**/CLAUDE.md` 및 `**/AGENTS.md`를 찾습니다.
2. 변경된 파일 중 최소 하나 이상의 조상 디렉토리에 있는 파일로 필터링합니다. 표준 파일은 그 아래의 모든 파일을 제어합니다 (예: `plugins/compound-engineering/AGENTS.md`는 `plugins/compound-engineering/` 아래의 모든 항목에 적용됨).

결과 경로 목록을 `project-standards` 페르소나의 리뷰 컨텍스트 내 `<standards-paths>` 블록에 전달합니다 (Stage 4 참조). 페르소나는 파일을 직접 읽어 변경된 파일 타입과 관련된 섹션만 타겟팅합니다. 이는 오케스트레이터의 작업량을 줄이고(경로 탐색만 수행), 리뷰어에게 불필요한 내용으로 서브 에이전트 프롬프트를 비대하게 만드는 것을 방지합니다.

### Stage 4: 서브 에이전트 할당 (Spawn sub-agents)

#### 모델 계층화 (Model tiering)

세 명의 리뷰어는 세션 모델을 그대로 상속하며 오버라이드하지 않습니다: `ce-correctness-reviewer`, `ce-security-reviewer`, `ce-adversarial-reviewer`. 이들은 로직 버그, 보안 취약점, 적대적 실패 시나리오와 같은 가장 중요한 분석을 수행하므로 사용자가 설정한 최고 수준의 능력치를 사용해야 합니다. 사용자가 Opus를 사용 중이라면 이들도 Opus를 사용합니다.

다른 모든 페르소나 서브 에이전트와 CE 에이전트는 비용과 대기 시간을 줄이기 위해 플랫폼의 mid-tier 모델을 사용합니다. 정확한 할당 시점의 오버라이드 방식은 아래 '할당(Spawning)' 하위 섹션을 참조하십시오.

오케스트레이터(이 스킬)도 세션 모델을 상속합니다. 의도 파악, 리뷰어 선택, 발견 사항 병합/중복 제거 및 종합(Synthesis)을 담당하며, 이 작업들은 사용자가 설정한 것과 동일한 추론 능력이 필요합니다.

#### 실행 ID (Run ID)

에이전트를 할당하기 전에 고유한 실행 식별자를 생성합니다. 이 ID는 모든 에이전트 결과물 파일과 리뷰 후 실행 결과물을 동일한 디렉토리에 묶어주는 범위를 제공합니다.

```bash
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' ')
mkdir -p "/tmp/compound-engineering/ce-code-review/$RUN_ID"
```

각 페르소나 서브 에이전트에게 `{run_id}`를 전달하여 전체 분석 내용을 `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`에 저장할 수 있게 합니다.

**Report-only 모드:** 실행 ID 생성 및 디렉토리 생성을 건너뜁니다. 에이전트에게 `{run_id}`를 전달하지 않습니다. 에이전트는 파일 쓰기 없이 압축된 JSON만 반환하며, 이는 report-only의 '쓰기 없음' 원칙과 일치합니다.

#### 할당 (Spawning)

사용자가 설정한 권한 설정이 적용되도록 서브 에이전트를 할당할 때 `mode` 파라미터를 생략하십시오. `mode: "auto"`를 전달하지 마십시오.

**할당 시점 모델 오버라이드.** 세션 모델을 상속하는 `ce-correctness-reviewer`, `ce-security-reviewer`, `ce-adversarial-reviewer`를 제외한 모든 할당 시 플랫폼의 mid-tier 모델을 전달하십시오. Claude Code에서는 `Agent` 도구 호출 시 `model: "sonnet"`을 추가합니다. Codex에서는 `spawn_agent` 시 그에 상응하는 mid-tier(예: 2026년 4월 기준 `gpt-5.4-mini`)를 전달합니다. Pi에서는 `pi-subagents` 확장 프로그램을 통해 `subagent` 호출 시 동등한 모델을 전달합니다. 할당 도구에 모델 오버라이드 파라미터가 없거나 사용 가능한 모델 이름을 모르는 경우 오버라이드를 생략하십시오. 잘못된 이름을 사용하여 할당에 실패하는 것보다 부모 모델로 정상 실행하는 것이 낫습니다. 병렬 할당의 모든 `Agent` / `spawn_agent` / `subagent` 호출에서 이를 확인하십시오. Opus 세션에서 이를 누락하면 리뷰 비용이 조용히 3~4배 증가합니다.

**제한된 병렬 할당.** 현재 도구의 활성 서브 에이전트 제한을 준수하십시오. 선택된 리뷰어를 큐에 넣고 도구가 허용하는 만큼만 할당하며, 리뷰어가 완료되면 비어 있는 슬롯을 채웁니다. 활성 에이전트/스레드/동시성 제한으로 인한 할당 에러는 리뷰어 실패가 아니라 배압(backpressure)으로 처리하십시오. 리뷰어를 큐에 남겨두고 슬롯이 비면 다시 시도하십시오. 할당에 성공한 후 타임아웃/실패하거나, 용량 문제 외의 이유로 할당에 실패한 경우에만 리뷰어 실패로 기록하십시오.

아래 포함된 서브 에이전트 템플릿을 사용하여 각 선택된 페르소나 리뷰어를 할당합니다. 각 페르소나 서브 에이전트는 다음을 받습니다.

1. 페르소나 파일 내용 (정체성, 실패 모드, 캘리브레이션, 억제 조건)
2. 아래 포함된 diff-scope 참조의 공유 diff 범위 규칙
3. 아래 포함된 발견 사항 스키마의 JSON 출력 계약
4. PR 메타데이터: PR 리뷰 시 제목, 본문 및 URL (그 외에는 빈 문자열). 리뷰어가 명시된 의도에 따라 코드를 검증할 수 있도록 `<pr-context>` 블록에 전달됩니다.
5. 리뷰 컨텍스트: 의도 요약, 파일 목록, diff
6. 결과물 파일 경로를 위한 실행 ID 및 리뷰어 이름
7. **`project-standards` 전용:** Stage 3b에서 얻은 표준 파일 경로 목록. 리뷰 컨텍스트 끝에 추가된 `<standards-paths>` 블록으로 전달됩니다.

페르소나 서브 에이전트는 프로젝트에 대해 **읽기 전용**입니다. 이들은 리뷰하고 구조화된 JSON을 반환할 뿐, 프로젝트 파일을 수정하거나 리팩토링을 제안하지 않습니다. 유일하게 허용된 쓰기 작업은 출력 계약에 명시된 실행 결과물 경로(`/tmp/compound-engineering/ce-code-review/<run-id>/` 아래)에 전체 분석 내용을 저장하는 것입니다.

여기서 읽기 전용이란 "쉘 액세스 금지"가 아니라 **"수정 금지(non-mutating)"**를 의미합니다. 리뷰어 서브 에이전트는 근거를 수집하거나 범위를 확인하기 위해 필요한 경우 `git diff`, `git show`, `git blame`, `git log`, `gh pr view`와 같은 읽기 중심의 `git` / `gh` 사용을 포함하여 수정하지 않는 조사 명령을 사용할 수 있습니다. 프로젝트 파일을 수정하거나, 브랜치를 변경하거나, 커밋, 푸시, PR 생성 또는 기타 체크아웃 및 레포지토리 상태를 수정하는 작업을 수행해서는 안 됩니다.

각 페르소나 서브 에이전트는 `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`에 전체 JSON(모든 스키마 필드)을 작성하고, 머지 단계에 필요한 필드만 포함된 압축된 JSON을 반환합니다.

```json
{
  "reviewer": "security",
  "findings": [
    {
      "title": "User-supplied ID in account lookup without ownership check",
      "severity": "P0",
      "file": "orders_controller.rb",
      "line": 42,
      "confidence": 100,
      "autofix_class": "gated_auto",
      "owner": "downstream-resolver",
      "requires_verification": true,
      "pre_existing": false,
      "suggested_fix": "Add current_user.owns?(account) guard before lookup"
    }
  ],
  "residual_risks": [...],
  "testing_gaps": [...]
}
```

상세 필드(`why_it_matters`, `evidence`)는 결과물 파일에만 있습니다. `suggested_fix`는 두 계층 모두에서 선택 사항입니다. 오케스트레이터가 자동 적용 결정을 위한 수정 컨텍스트를 가질 수 있도록 압축된 반환값에도 포함됩니다. 파일 쓰기에 실패하더라도 압축된 반환값이 병합에 필요한 모든 정보를 제공합니다.

**CE 항상 활성화 에이전트**(`ce-agent-native-reviewer`, `ce-learnings-researcher`)는 페르소나 에이전트와 동일한 제한된 병렬 스케줄러를 통해 표준 `Agent` 호출로 할당됩니다. 페르소나가 받는 것과 동일한 리뷰 컨텍스트 번들을 제공하십시오: 진입 모드, Stage 1에서 수집된 모든 PR 메타데이터, 의도 요약, 확인된 경우 리뷰 베이스 브랜치 이름, `BASE:` 마커, 파일 목록, diff 및 `UNTRACKED:` 범위 메모. 단순히 "이것을 리뷰해줘"라는 프롬프트로 호출하지 마십시오. 이들의 출력은 비구조화되어 있으며 Stage 6에서 별도로 종합됩니다.

**CE 조건부 에이전트**(`ce-schema-drift-detector`, `ce-deployment-verification-agent`) 역시 해당하는 경우 동일한 제한된 병렬 스케줄러를 통해 표준 `Agent` 호출로 할당됩니다. 리뷰 컨텍스트 번들과 함께 적용 사유(예: 어떤 마이그레이션 파일이 에이전트를 트리거했는지)를 전달하십시오. `ce-schema-drift-detector`의 경우 특히 확인된 리뷰 베이스 브랜치를 명시적으로 전달하여 결코 `main`으로 가정하지 않게 하십시오. 이들의 출력도 비구조화되어 있으며 CE 항상 활성화 에이전트와 마찬가지로 Stage 6 종합을 위해 보존되어야 합니다.

### Stage 5: 발견 사항 병합 (Merge findings)

여러 리뷰어의 압축된 JSON 반환값을 하나의 중복 제거되고 신뢰도 기반으로 필터링된 발견 사항 세트로 변환합니다. 압축된 반환값에는 머지 단계 필드(제목, 심각도, 파일, 줄 번호, 신뢰도, `autofix_class`, 소유자, 검증 필요 여부, 기존 존재 여부)와 선택적인 `suggested_fix`가 포함되어 있습니다. 상세 필드(`why_it_matters`, `evidence`)는 디스크의 리뷰어별 결과물 파일에 있으며 이 단계에서는 로드하지 않습니다.

`confidence`는 발견 사항 스키마에 정의된 5개의 이산적인 앵커(`0`, `25`, `50`, `75`, `100`) 중 하나입니다. Synthesis 단계에서는 앵커를 정수로 처리하며 부동 소수점으로 강제 변환하지 마십시오.

1. **검증 (Validate).** 각 압축된 반환값에 필수 최상위 필드 및 발견 사항별 필드, 값 제약 조건이 있는지 확인합니다. 잘못된 형식의 반환값이나 발견 사항은 폐기하고 폐기된 개수를 기록합니다.
   - **최상위 필수:** reviewer (string), findings (array), residual_risks (array), testing_gaps (array). 누락되거나 타입이 틀리면 반환값 전체를 폐기합니다.
   - **발견 사항별 필수:** title, severity, file, line, confidence, autofix_class, owner, requires_verification, pre_existing
   - **값 제약 조건:**
     - severity: P0 | P1 | P2 | P3
     - autofix_class: safe_auto | gated_auto | manual | advisory
     - owner: review-fixer | downstream-resolver | human | release
     - confidence: {0, 25, 50, 75, 100} 중 정수
     - line: 양의 정수
     - pre_existing, requires_verification: 불리언
   - 여기서는 전체 스키마를 검증하지 마십시오. 전체 스키마(why_it_matters 및 evidence 포함)는 압축된 반환값이 아닌 디스크의 결과물 파일에 적용됩니다.
2. **중복 제거 (Deduplicate).** 지문(fingerprint)을 계산합니다: `normalize(file) + line_bucket(line, +/-3) + normalize(title)`. 지문이 일치하면 병합합니다: 가장 높은 심각도 유지, 가장 높은 앵커 유지, 어떤 리뷰어가 플래그를 지정했는지 기록. 단계 3의 교차 리뷰어 프로모션이 일치하는 앵커 50 발견 사항을 실행 가능 계층으로 올릴 수 있도록 앵커 50을 포함한 전체 검증 세트에 대해 중복 제거를 실행합니다.
3. **교차 리뷰어 합의 (Cross-reviewer agreement).** 2명 이상의 독립적인 리뷰어가 동일한 문제(동일한 지문)를 지적하면 병합된 발견 사항의 앵커를 한 단계 올립니다: `50 -> 75`, `75 -> 100`, `100 -> 100`. 교차 리뷰어의 입증은 단일 리뷰어의 앵커보다 더 강력한 신호입니다. 프로모션은 이전에 보류되었던 발견 사항을 실행 가능 계층으로 보내거나 이미 실행 가능한 사항의 지위를 강화합니다. 출력의 Reviewer 열에 합의 내용을 기록합니다 (예: "security, correctness").
4. **기존 존재 사항 분리 (Separate pre-existing).** `pre_existing: true`인 발견 사항을 별도의 리스트로 분리합니다.
5. **의견 불일치 해결 (Resolve disagreements).** 리뷰어들이 동일한 코드 영역을 지적했지만 심각도, `autofix_class` 또는 소유자에 대해 의견이 다른 경우, Reviewer 열에 불일치 내용을 주석으로 추가합니다 (예: "security (P0), correctness (P1) -- kept P0"). 이러한 투명성은 사용자가 왜 발견 사항이 그렇게 라우팅되었는지 이해하는 데 도움이 됩니다.
6. **라우팅 정규화 (Normalize routing).** 병합된 각 발견 사항에 대해 최종 `autofix_class`, 소유자 및 `requires_verification`을 설정합니다. 리뷰어 간 의견이 다르면 가장 보수적인 경로를 유지합니다. Synthesis 단계는 발견 사항을 `safe_auto`에서 `gated_auto` 또는 `manual`로 좁힐 수 있지만, 새로운 증거 없이는 넓혀서는 안 됩니다.
6b. **권장 조치 도출 (Derive the recommended action).** Interactive 모드의 워크스루 및 베스트 저지먼트 경로는 발견 사항별 권장 조치(Apply / Defer / Skip / Acknowledge)를 제시합니다. 권장 조치는 정규화된 `autofix_class`와 `suggested_fix`의 존재 여부를 사용하여 다음 매핑에 따라 도출됩니다.

| `autofix_class` | `suggested_fix` 존재 여부 | 권장 조치 |
|-----------------|--------------------------|--------------------|
| `safe_auto`     | (라우팅 질문 전 자동 적용되므로 베스트 저지먼트/워크스루에는 노출되지 않음) | Apply |
| `gated_auto`    | 있음                      | Apply |
| `gated_auto`    | 없음                      | Defer |
| `manual`        | **있음**                  | **Apply** |
| `manual`        | 없음                      | Defer |
| `advisory`      | 해당 없음                  | Acknowledge |

`suggested_fix`의 존재 여부는 에이전트가 해당 발견 사항에 대해 행동할 수 있다는 권위 있는 신호입니다. `suggested_fix`가 **있는** `manual` 발견 사항은 페르소나가 리뷰 컨텍스트에 근거하여 구체적인 수정 형태를 확약했으므로(서브 에이전트 템플릿의 suggested_fix 규칙에 따라) Apply를 권장합니다. `suggested_fix`가 **없는** `manual` 발견 사항은 리뷰어가 제공할 수 없는 교차 팀의 입력이나 비즈니스 규칙 컨텍스트가 진정으로 필요하다는 신호를 보낸 것이므로 Defer를 권장합니다. `autofix_class` 자체가 이 매핑에 의해 무너지지 않습니다. 보고서에는 여전히 페르소나가 생각한 것(`manual` vs `gated_auto`)이 기록되며, 이 구분은 `ce-resolve-pr-feedback`과 같은 다운스트림 영역에서 중요합니다.

**교차 리뷰어 동점 처리 (Cross-reviewer tie-break).** 기여 리뷰어들이 동일한 병합된 발견 사항에 대해 서로 다른 조치를 암시한 경우, Synthesis는 `Skip > Defer > Apply > Acknowledge` 순서를 사용하여 가장 보수적인 항목을 선택합니다. 이 규칙은 여러 리뷰어 간의 의견 불일치가 있을 때만 발동하며, 위에서 언급한 발견 사항별 매핑이 단일 리뷰어의 기본값입니다. 동점 처리 규칙은 동일한 리뷰 결과물이 결정론적으로 동일한 권장 사항을 생성하도록 보장하여, 베스트 저지먼트 결과가 사후 검토 가능하고 워크스루의 권장 사항이 재실행 시에도 안정적으로 유지되도록 합니다. 사용자는 워크스루 옵션을 통해 발견 사항별로 이를 오버라이드할 수 있습니다. 이 규칙은 "권장(recommended)"이라고 라벨링될 항목만 결정합니다.
6c. **모호한 일반 품질 발견 사항의 모드 인식 격하 (Mode-aware demotion).** 일부 페르소나 출력은 실제 신호이지만 기본 발견 사항으로 주목받을 수준은 아닙니다. 기본 발견 사항 테이블이 실행 가능한 이슈에 집중할 수 있도록 이러한 항목을 기존의 소프트 버킷(soft bucket)으로 리라우팅합니다.

다음 조건이 **모두** 충족될 때 발견 사항은 격하 대상이 됩니다:
   - 심각도가 P2 또는 P3 (P0 및 P1은 항상 기본 발견 사항에 유지됨)
   - `autofix_class`가 `advisory` (구체적인 수정이 있는 발견 사항은 기본 발견 사항에 유지됨)
   - **모든** 기여 리뷰어가 `testing` 또는 `maintainability`임 — 다른 페르소나가 이 발견 사항을 지적했다면 교차 리뷰어 합의가 있는 것이며, 심각도나 자문 상태에 관계없이 기본 발견 사항에 유지됩니다 (나중에 증거가 있을 때만 약한 신호 목록을 확장하십시오).

발견 사항이 적격하면 모드에 따라 라우팅합니다:
   - **Interactive 및 report-only 모드:** 발견 사항을 기본 발견 사항 세트에서 뺍니다. 기여 리뷰어가 `testing`이면 `<file:line> -- <title>`을 `testing_gaps`에 추가합니다. `maintainability`인 경우 `residual_risks`에 추가합니다. Coverage에 격하 개수를 기록합니다. 이 발견 사항은 Stage 6 발견 사항 테이블에 나타나지 않습니다. (제목만 사용합니다. 압축된 반환값에는 `why_it_matters`가 없으며 report-only 모드는 결과물 파일을 건너뜁니다. 소프트 버킷 항목은 참고용입니다. 깊이 있는 내용을 원하는 독자는 결과물 파일이 있을 때 이를 열어볼 수 있습니다.)
   - **Headless 및 autofix 모드:** 발견 사항을 완전히 억제합니다. Coverage에 "mode-aware demotion suppressions"로 억제된 개수를 기록하여 사용자가 필터링된 항목을 볼 수 있게 합니다.

격하는 의도적으로 좁게 설정되었습니다. 보수적인 범위(testing/maintainability + P2/P3 + advisory)가 시작점입니다. 어떤 페르소나가 노이즈를 과도하게 생성할지 추측하여 규칙을 확장하지 마십시오. 실제 리뷰 실행에서 다른 페르소나가 일관되게 약한 신호를 보내는 것이 확인되면 증거를 바탕으로 확장하십시오.

7. **신뢰도 게이트 (Confidence gate).** 중복 제거, 프로모션, 격하가 기본 세트의 형태를 갖춘 후, 앵커 75 미만의 남은 발견 사항을 억제합니다. 예외: 앵커 50 이상의 P0 발견 사항은 게이트를 통과하여 생존합니다. 치명적이지만 불확실한 이슈는 조용히 누락되어서는 안 됩니다. 앵커별 억제 개수를 기록합니다 (Coverage에서 "N findings suppressed at anchor 50, M at anchor 25"라고 보고할 수 있도록). 게이트는 의도적으로 늦게 실행됩니다. 앵커 50 발견 사항은 누락 결정 전 단계 3(교차 리뷰어 합의)에 의해 프로모션되거나 단계 6c(소프트 버킷으로의 모드 인식 격하)에 의해 리라우팅될 기회를 가져야 합니다.
8. **작업 파티셔닝 (Partition the work).** 세 가지 세트를 구축합니다.
   - 스킬 내 수정 큐 (in-skill fixer queue): `safe_auto -> review-fixer`만 포함
   - 잔여 실행 가능 큐 (residual actionable queue): 소유자가 `downstream-resolver`인 미해결 `gated_auto` 또는 `manual` 발견 사항
   - 보고 전용 큐 (report-only queue): `advisory` 발견 사항 및 소유자가 `human` 또는 `release`인 모든 출력물
9. **정렬 및 번호 매기기 (Sort and number).** 심각도(P0 우선) -> 앵커(내림차순) -> 파일 경로 -> 줄 번호 순으로 정렬한 후, 정렬된 순서에 따라 전체 기본 발견 사항 세트에 걸쳐 단조 증가하는 `#` 값을 할당합니다. 각 심각도 테이블이나 autofix/라우팅 버킷 내부에서 번호 매기기를 다시 시작하지 마십시오. 나중에 섹션에서 발견 사항이 반복되는 경우(예: `safe_auto` 수정이 적용된 후의 잔여 실행 가능 작업), 동일하고 안정적인 `#`를 재사용하십시오. 이를 통해 사용자 및 `ce-resolve-pr-feedback`과 같은 다운스트림 스킬이 autofix 루프가 보고서를 재작성한 후에도 `#`를 통해 발견 사항을 참조할 수 있습니다. autofix 후 번호를 다시 매기면 복사된 스니펫, `#3`을 인용하는 후속 프롬프트, 이전 렌더링에 대해 생성된 티켓 등 이전의 모든 참조가 무효화됩니다.
10. **커버리지 데이터 수집 (Collect coverage data).** 리뷰어 전체의 `residual_risks` 및 `testing_gaps`를 합칩니다.
11. **CE 에이전트 결과물 보존 (Preserve CE agent artifacts).** 병합된 발견 사항 세트와 함께 learnings, agent-native, schema-drift, deployment-verification 출력물을 유지합니다. 페르소나 JSON 스키마와 일치하지 않는다는 이유로 비구조화된 에이전트 출력을 버리지 마십시오.

### Stage 5b: 검증 패스 (외부화 모드 전용) (Validation pass (externalizing modes only))

독립적인 검증 게이트입니다. `references/validator-template.md`를 사용하여 생존한 발견 사항 하나당 하나의 검증자(validator) 서브 에이전트를 할당합니다. 검증자의 역할은 원래 페르소나의 분석에 얽매이지 않고 diff와 주변 코드를 바탕으로 발견 사항을 다시 확인하는 것입니다. 검증자가 거부한 발견 사항은 폐기되고, 검증자가 확인한 발견 사항은 변경 없이 통과됩니다.

**이 단계가 실행되는 시점:**

| 모드 | Stage 5b 실행 여부 | 시점 |
|------|---------------|-------|
| `headless` | 예, 즉시 실행 | Stage 5와 Stage 6 사이 |
| `autofix` | 예, 즉시 실행 | Stage 5와 Stage 6 사이 |
| `interactive`, 워크스루 라우팅 (옵션 A) — 발견 사항별 단계 | 아니오 -- 사용자가 발견 사항별 검증자임 | 해당 없음 |
| `interactive`, 워크스루 라우팅 (옵션 A) — 나머지 베스트 저지먼트 전달 | 아니오 -- 베스트 저지먼트 경로는 즉시 수정 도구를 할당하며, 수정 도구의 적용/실패 결과가 검증임 | 해당 없음 |
| `interactive`, 베스트 저지먼트 라우팅 (옵션 B) | 아니오 -- 베스트 저지먼트 경로는 즉시 수정 도구를 할당하며, 수정 도구의 적용/실패 결과가 검증임 | 해당 없음 |
| `interactive`, 티켓 생성 라우팅 (옵션 C) | 예, 모든 대기 중인 발견 사항에 대해 | 트래커 할당 전 |
| `interactive`, 보고 전용 라우팅 (옵션 D) | 아니오 -- 외부화되는 것이 없음 | 해당 없음 |
| `report-only` | 아니오 -- 읽기 전용 모드는 아무것도 외부화하지 않음 | 해당 없음 |

베스트 저지먼트 경로는 Stage 5b를 의도적으로 건너뜁니다. 수정 도구 할당 전에 발견 사항별 검증자를 실행하는 것은 조사의 중복입니다. 수정 도구는 수정을 적용하거나 제안할 때 자연스럽게 각 발견 사항을 다시 확인하며, 인용된 근거가 더 이상 코드와 일치하지 않는 항목(Stage 5b가 잡아낼 위양성 케이스)은 수정 시도 중에 `failed` 버킷으로 라우팅됩니다. 사용자는 diff와 실행 후 실패 처리 질문(Step 2 Interactive 옵션 B 참조)을 통해 리뷰하며, 할당 전 검증자 게이트를 통하지 않습니다.

Stage 5b가 실행되지 않을 때는 Stage 5에서 병합된 발견 사항 세트가 Stage 6로 그대로 전달됩니다. 실행될 때는 아래 단계들이 해당 세트에 대해 실행됩니다.

**단계:**

1. **검증할 발견 사항 선택.**
   - **headless/autofix:** Stage 5의 모든 생존 항목.
   - **interactive 티켓 생성 (옵션 C):** 권장 조치에 관계없이 모든 대기 중인 발견 사항. 옵션 C는 모든 발견 사항을 티켓으로 외부화하므로 모든 항목에 대해 검증이 필요합니다.
2. **할당 예산 제한 적용.** 선택된 세트가 15개를 초과하면 심각도가 가장 높은 15개를 검증합니다 (P0 우선, 그 다음 P1, P2, P3 순이며, 동점인 경우 앵커 내림차순). 나머지는 폐기하고 Coverage 섹션에 예산 초과 폐기 개수를 기록합니다. 15개 이상의 생존 발견 사항을 생성하는 리뷰은 이미 두 번째 물결이 사용자의 triage 방식을 바꾸지 못하는 영역에 들어와 있으므로 뭉툭하게 잘라내는 것이 의도된 동작입니다.
3. **제한된 병렬 처리로 검증자 할당.** 검증자 템플릿과 Stage 4의 동일한 제한된 스케줄러를 사용하여 발견 사항 하나당 하나의 서브 에이전트를 독립적으로 할당합니다. 각 검증자는 다음을 받습니다.
   - 발견 사항의 제목, 심각도, 파일, 줄 번호, `suggested_fix`, 원래 리뷰어 이름 및 신뢰도 앵커
   - 가능한 경우 `why_it_matters` — `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`에 있는 리뷰어별 결과물 파일에서 로드합니다. 파일이 없거나 결과물 쓰기에 실패한 경우 생략합니다. 검증자는 diff와 인용된 코드를 직접 사용하여 작업을 진행합니다.
   - 전체 diff
   - 인용된 코드, 호출자, 가드, 프레임워크 기본값 및 git blame을 조사하기 위한 읽기 도구 액세스
4. **결과 수집.** 각 검증자는 `{ "validated": true | false, "reason": "<한 문장 요약>" }`을 반환합니다.
   - `validated: true` -> 발견 사항은 다음 단계(headless/autofix의 경우 Stage 6, interactive의 경우 할당)로 변경 없이 전달됨
   - `validated: false` -> 발견 사항 폐기. 검증자의 사유를 Coverage에 기록함
   - 검증자 실패 (타임아웃, 할당 에러, 잘못된 형식의 JSON) -> "validator failed" 사유와 함께 발견 사항 폐기. 보수적인 편향이 옳습니다.
5. **검증자에 mid-tier 모델 사용.** 페르소나 리뷰어가 사용하는 것과 동일한 모델 클래스(sonnet)를 사용합니다. 검증자는 읽기 전용이며 페르소나 리뷰어와 동일한 제약을 가집니다. 이들은 수정하지 않는 조사 명령(Read, Grep, Glob, git blame, gh)을 사용할 수 있습니다.
6. **Coverage 메트릭 기록.** 총 할당 수, 검증 성공 개수, 검증 실패 개수(사유 포함), 실패 수 및 예산 초과 폐기 수를 기록합니다.

**발견 사항별 제한된 할당이 필요한 이유 (배치 처리 안 함):** 독립성이 핵심입니다. 모든 발견 사항을 한꺼번에 보는 단일 배치 검증자는 발견 사항 간에 패턴 매칭을 수행하여 페르소나 편향 문제를 재현합니다. 발견 사항별 할당은 신선한 컨텍스트를 유지하는 반면 스케줄러는 도구의 제한을 준수합니다. 많은 발견 사항이 소수의 파일에 집중된 리뷰의 경우 파일별 배치 처리가 그럴듯한 미래의 최적화 방안이지만 현재는 구현되지 않았습니다.

### Stage 6: 종합 및 제시 (Synthesize and present)

아래 포함된 리뷰 출력 템플릿의 **발견 사항을 위한 파이프 구분 마크다운 테이블**을 사용하여 최종 보고서를 구성합니다. Interactive 모드에서 발견 사항 행에는 테이블 형식이 필수입니다. 발견 사항을 자유 형식의 텍스트 블록이나 가로줄로 구분된 산문으로 렌더링하지 마십시오. 보고서의 다른 섹션(적용된 수정 사항, 학습 내용, 커버리지 등)은 템플릿에 표시된 대로 불릿 리스트와 Verdict 전의 `---` 구분선을 사용합니다.

1. **헤더 (Header).** 범위, 의도, 모드, 조건부 근거가 포함된 리뷰어 팀.
2. **발견 사항 (Findings).** 심각도별로 그룹화된 파이프 구분 테이블로 렌더링합니다 (`### P0 -- Critical`, `### P1 -- High`, `### P2 -- Moderate`, `### P3 -- Low`). 각 발견 사항 행은 `#`, 파일, 이슈, 리뷰어, 신뢰도 및 종합된 경로를 보여줍니다. 비어 있는 심각도 레벨은 생략합니다. 발견 사항을 자유 형식의 텍스트 블록이나 번호가 매겨진 리스트로 렌더링하지 마십시오. 발견 사항 번호는 Stage 5의 고정된 할당 번호를 따르며 심각도 테이블마다 다시 매기지 않습니다.
3. **요구사항 완료 여부 (Requirements Completeness).** Stage 2b에서 플랜이 발견된 경우에만 포함합니다. 플랜의 각 요구사항(R1, R2 등) 및 구현 단위에 대해 대응하는 작업이 diff에 나타나는지 보고합니다. 단순 체크리스트(충족됨 / 다뤄지지 않음 / 부분적으로 다뤄짐)를 사용합니다. 라우팅은 `plan_source`에 따라 다릅니다.
   - **`explicit`** (호출자가 제공하거나 PR 본문): 다뤄지지 않은 요구사항이나 구현 단위를 `autofix_class: manual`, `owner: downstream-resolver`인 P1 발견 사항으로 지정합니다. 이들은 잔여 실행 가능 큐에 들어갑니다.
   - **`inferred`** (자동 탐색): 다뤄지지 않은 요구사항이나 구현 단위를 `autofix_class: advisory`, `owner: human`인 P3 발견 사항으로 지정합니다. 이들은 보고서에만 남으며 자율적인 후속 조치는 없습니다. 추론된 플랜 일치는 힌트일 뿐 계약이 아닙니다.
   플랜이 발견되지 않은 경우 이 섹션 전체를 생략하십시오. 플랜이 없다는 언급도 하지 마십시오.
4. **적용된 수정 사항 (Applied Fixes).** 이번 호출에서 수정 단계가 실행된 경우에만 포함합니다.
5. **잔여 실행 가능 작업 (Residual Actionable Work).** 해결되지 않은 실행 가능 발견 사항이 전달되었거나 전달되어야 하는 경우 포함합니다.
6. **기존 존재 사항 (Pre-existing).** 별도 섹션이며 Verdict에 합산되지 않습니다.
7. **학습 내용 및 과거 솔루션 (Learnings & Past Solutions).** `ce-learnings-researcher` 결과를 노출합니다. 과거 솔루션이 관련 있는 경우 `docs/solutions/` 파일 링크와 함께 "Known Pattern"으로 지정합니다.
8. **에이전트 네이티브 공백 (Agent-Native Gaps).** `ce-agent-native-reviewer` 결과를 노출합니다. 공백이 발견되지 않으면 섹션을 생략합니다.
9. **스키마 드리프트 확인 (Schema Drift Check).** `ce-schema-drift-detector`가 실행된 경우 드리프트 발견 여부를 요약합니다. 드리프트가 있으면 관련 없는 스키마 객체와 필요한 정리 명령을 나열합니다. 깨끗하면 간단히 명시합니다.
10. **배포 노트 (Deployment Notes).** `ce-deployment-verification-agent`가 실행된 경우 주요 Go/No-Go 항목을 노출합니다: 차단용 사전 배포 체크, 가장 중요한 검증 쿼리, 롤백 주의사항 및 모니터링 중점 영역. 체크리스트를 Coverage에 던져두지 말고 실행 가능하게 유지하십시오.
11. **커버리지 (Coverage).** 앵커별 억제 개수(예: "N findings suppressed at anchor 50, M at anchor 25"), 모드 인식 격하 개수(interactive/report-only) 또는 억제 개수(headless/autofix), 검증자 폐기 개수 및 사유(Stage 5b 실행 시), 검증자 예산 초과 폐기 개수(15개 제한 발동 시), 잔여 위험, 테스트 공백, 실패/타임아웃된 리뷰어, 비대화형 모드에서 발생한 의도 불확실성.
12. **평결 (Verdict).** Ready to merge / Ready with fixes / Not ready. 해당되는 경우 수정 순서. `explicit` 플랜에 다뤄지지 않은 요구사항이나 구현 단위가 있는 경우 평결에 반영해야 합니다. 코드는 깨끗하지만 계획된 요구사항이 누락된 PR은 의도적인 생략이 아닌 한 "Not ready"입니다. `inferred` 플랜에 누락 사항이 있는 경우 평결 근거에 기록하되 그 자체로 차단하지는 마십시오.

시간 추정치를 포함하지 마십시오.

**형식 검증:** 보고서를 전달하기 전에 발견 사항 섹션이 자유 형식의 텍스트가 아닌 파이프 구분 테이블 행(`| # | File | Issue | ... |`)을 사용하는지 확인하십시오. 발견 사항을 가로줄로 구분된 산문 블록이나 불릿 포인트로 렌더링하고 있다면 멈추고 테이블 형식으로 재구성하십시오.

### Headless 출력 형식

`mode:headless`에서는 대화형 파이프 구분 테이블 보고서 대신 구조화된 텍스트 봉투(text envelope)를 사용합니다. 이 봉투는 `document-review`의 headless 출력과 동일한 구조적 패턴(완료 헤더, 메타데이터 블록, `autofix_class`별로 그룹화된 발견 사항, 후미 섹션)을 따르며 `ce-code-review` 고유의 섹션 헤더와 발견 사항별 필드를 사용합니다.

```
Code review complete (headless mode).

Scope: <scope-line>
Intent: <intent-summary>
Reviewers: <reviewer-list with conditional justifications>
Verdict: <Ready to merge | Ready with fixes | Not ready>
Artifact: /tmp/compound-engineering/ce-code-review/<run-id>/

Applied N safe_auto fixes.

Gated-auto findings (concrete fix, changes behavior/contracts):

[P1][gated_auto -> downstream-resolver][needs-verification] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">
  Evidence: <evidence[0]>
  Evidence: <evidence[1]>

Manual findings (actionable, needs handoff):

[P1][manual -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Evidence: <evidence[0]>

Advisory findings (report-only):

[P2][advisory -> human] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Pre-existing issues:
[P2][gated_auto -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Residual risks:
- <risk>

Learnings & Past Solutions:
- <learning>

Agent-Native Gaps:
- <gap description>

Schema Drift Check:
- <drift status>

Deployment Notes:
- <deployment note>

Testing gaps:
- <gap>

Coverage:
- Suppressed: <N> findings below anchor 75 (P0 at anchor 50+ retained)
- Mode-aware demotion suppressions: <N> findings suppressed (testing/maintainability advisory P2-P3)
- Validator drops: <N> findings rejected by Stage 5b validator
  - <file:line> -- <reason>
- Validator over-budget drops: <N> findings exceeded the 15-cap and were not validated
- Untracked files excluded: <file1>, <file2>
- Failed reviewers: <reviewer>

Review complete
```

**상세 정보 보강 (headless 전용):** headless 봉투에는 `Why:`, `Evidence:`, `Suggested fix:` 줄이 포함됩니다. 병합(Stage 5) 후, 중복 제거와 신뢰도 게이트를 통과한 발견 사항에 대해서만 `/tmp/compound-engineering/ce-code-review/{run_id}/`의 리뷰어별 결과물 파일을 읽습니다.
   - **필드 계층:** `Why:`와 `Evidence:`는 상세 계층(detail-tier)이므로 결과물 파일에서 로드합니다. `Suggested fix:`는 머지 계층(merge-tier)이므로 결과물 조회 없이 압축된 반환값에서 직접 사용합니다.
   - **결과물 매칭:** 생존한 각 발견 사항에 대해 기여 리뷰어의 결과물 파일에서 상세 계층 필드를 찾습니다. 각 기여 리뷰어의 결과물 내에서 `file + line_bucket(line, +/-3)`(Stage 5 중복 제거와 동일한 허용 오차)을 기준으로 매칭합니다. 라인 버킷 내에 여러 결과물 항목이 걸리는 경우, 병합된 발견 사항의 제목과 각 후보 항목의 제목에 `normalize(title)`을 적용하여 타이브레이커(tie-breaker)로 사용합니다.
   - **리뷰어 순서:** 병합된 발견 사항의 리뷰어 리스트에 나타난 순서대로 기여 리뷰어들을 시도하며, 첫 번째 일치 항목을 사용합니다.
   - **일치 항목 없음 폴백:** 어떤 결과물 파일에도 일치 항목이 없는 경우(모든 쓰기 실패 또는 머지 중 합성된 발견 사항), 해당 발견 사항의 `Why:` 및 `Evidence:` 줄을 생략하고 Coverage에 누락 사실을 기록합니다. `Suggested fix:` 줄은 압축된 반환값에서 가져올 수 있으므로 여전히 채워질 수 있습니다.

**형식 규칙:**
- `[needs-verification]` 마커는 `requires_verification: true`인 발견 사항에만 나타납니다.
- `Artifact:` 줄은 호출자가 기계 판독 가능한 완전한 발견 사항 스키마에 접근할 수 있는 전체 실행 결과물 경로를 제공합니다. 텍스트 봉투가 주요 전달물이며 결과물은 디버깅 및 완전성 확인용입니다.
- `owner: release`인 발견 사항은 Advisory 섹션에 나타납니다 (코드 수정이 아닌 운영/롤아웃 항목임).
- `pre_existing: true`인 발견 사항은 `autofix_class`에 관계없이 Pre-existing 섹션에 나타납니다.
- 평결(Verdict)은 메타데이터 헤더에 나타납니다 (대화형 형식은 하단에 나타나지만, 프로그래밍 방식 호출자가 평결을 먼저 얻을 수 있도록 의도적으로 재배치됨).
- 항목이 0개인 섹션은 생략합니다.
- 모든 리뷰어가 실패하거나 타임아웃되면 `Code review degraded (headless mode). Reason: 0 of N reviewers returned results.`를 출력한 후 "Review complete"를 출력합니다.
- 호출자가 완료를 감지할 수 있도록 마지막에 "Review complete" 신호를 보내 종료합니다.

## 품질 게이트 (Quality Gates)

리뷰를 전달하기 전에 다음을 확인하십시오.

1. **모든 발견 사항은 실행 가능해야 합니다.** 각 발견 사항을 다시 읽어보십시오. 구체적인 수정 사항 없이 "고려해 보십시오", "~할 수 있습니다", "~가 개선될 수 있습니다"라고 되어 있다면 구체적인 조치 사항으로 재작성하십시오. 모호한 발견 사항은 엔지니어링 시간을 낭비합니다.
2. **훑어보기로 인한 위양성(false positive)이 없어야 합니다.** 각 발견 사항에 대해 주변 코드를 실제로 읽었는지 확인하십시오. 해당 "버그"가 동일한 함수의 다른 곳에서 처리되고 있지는 않은지, "사용되지 않는 import"가 타입 어노테이션에서 사용 중이지 않은지, "누락된 null 체크"가 호출자에 의해 가드되고 있지 않은지 확인하십시오.
3. **심각도가 적절히 보정되어야 합니다.** 스타일 지적은 절대 P0가 아닙니다. SQL 인젝션은 절대 P3가 아닙니다. 모든 심각도 할당을 다시 확인하십시오.
4. **줄 번호가 정확해야 합니다.** 인용된 각 줄 번호를 파일 내용과 대조하십시오. 잘못된 줄을 가리키는 발견 사항은 발견 사항이 없는 것보다 나쁩니다.
5. **보호된 결과물이 존중되어야 합니다.** `docs/brainstorms/`, `docs/plans/` 또는 `docs/solutions/`에 있는 파일을 삭제하거나 gitignore하도록 권장하는 모든 발견 사항을 폐기하십시오.
6. **발견 사항이 린터(linter) 출력과 중복되지 않아야 합니다.** 프로젝트의 린터/포매터가 잡아낼 수 있는 사항(누락된 세미콜론, 잘못된 들여쓰기)을 지적하지 마십시오. 시맨틱(semantic) 이슈에 집중하십시오.

## 언어 인지 조건부 (Language-Aware Conditionals)

이 스킬은 diff가 명확하게 보증할 때 스택 전용 리뷰어 에이전트를 사용합니다. 이 에이전트들이 주관을 갖게 하십시오. 이들은 일반적인 언어 검사기가 아니며, '항상 활성화' 및 '교차' 페르소나 위에 고유한 리뷰 관점을 추가합니다.

파일 확장자만으로 기계적으로 할당하지 마십시오. 트리거는 해당 스택에서의 의미 있는 변경된 동작, 아키텍처 또는 UI 상태입니다.

## 리뷰 후 (After Review)

### 모드 기반 리뷰 후 흐름 (Mode-Driven Post-Review Flow)

발견 사항과 평결을 제시한 후(Stage 6), 모드에 따라 다음 단계를 라우팅합니다. 리뷰와 종합은 모든 모드에서 동일하지만, 수정 및 전달 동작만 달라집니다.

#### Step 1: 조치 세트 구축

- **깨끗한 리뷰(Clean review)**란 억제 및 기존 사항 분리 후 발견 사항이 0개인 것을 의미합니다. 리뷰가 깨끗하면 수정/전달 단계를 건너뜁니다.
- **수정 도구 큐(Fixer queue):** `safe_auto -> review-fixer`로 라우팅된 최종 발견 사항.
- **잔여 실행 가능 큐(Residual actionable queue):** 최종 소유자가 `downstream-resolver`인 미해결 `gated_auto` 또는 `manual` 발견 사항.
- **보고 전용 큐(Report-only queue):** `advisory` 발견 사항 및 `human` 또는 `release` 소유의 모든 출력물.
- **자문 전용(advisory-only) 출력을 수정 작업이나 티켓 전달로 변환하지 마십시오.** 배포 노트, 잔여 위험 및 release 소유 항목은 보고서에만 남습니다.

#### Step 2: 모드별 정책 선택

**Interactive 모드**

- 묻지 않고 `safe_auto -> review-fixer` 발견 사항을 자동으로 적용합니다. 이들은 정의상 안전합니다.
- **잔여 사항 없음 케이스:** `safe_auto` 패스 후 `gated_auto`나 `manual` 발견 사항이 남지 않으면 라우팅 질문을 완전히 건너뜁니다. 자문 및 기존 발견 사항(이 흐름에서 처리되지 않음)이 해결된 것으로 오해받지 않도록 완료 요약을 한 줄로 출력합니다. 보고서에 자문 또는 기존 발견 사항이 남아 있지 않으면 `All findings resolved — N safe_auto fixes applied.`가 정확합니다. 자문 또는 기존 발견 사항이 남아 있으면 `All actionable findings resolved — N safe_auto fixes applied. (K advisory, J pre-existing findings remain in the report.)`와 같이 조건부 형식을 사용하며, 0개인 항목은 생략합니다. 요약 후 기존의 리뷰 종료 평결을 내리고, Step 5의 게이팅 규칙에 따라 진행합니다.
- **트래커 사전 감지:** 라우팅 질문을 렌더링하기 전에 `references/tracker-defer.md`를 참조하여 세션의 트래커 튜플 `{ tracker_name, confidence, named_sink_available, any_sink_available }`을 확인합니다. 이 조사는 세션당 최대 한 번 실행되며 나머지 실행 동안 캐시됩니다. `named_sink_available`은 옵션 C 라벨을 결정합니다 (이름이 명시된 트래커를 실제로 호출할 수 있을 때만 해당 이름을 포함). `any_sink_available`은 옵션 C를 제공할지 여부를 결정합니다 (명시된 트래커에 도달할 수 없더라도 `gh`를 통한 GitHub Issues가 작동하면 옵션 C가 제공될 수 있습니다).
- **질문 도구 사전 로드 확인 (체크리스트, Claude Code 전용).** Claude Code에서 라우팅 질문을 실행하기 전에 `AskUserQuestion`이 로드되었는지 확인하십시오 (이 스킬 상단의 Interactive 모드 규칙 참조). 이번 세션에서 아직 로드되지 않았다면 지금 `ToolSearch`를 `select:AskUserQuestion`으로 호출하십시오. 이 확인 없이 라우팅 질문으로 진행하지 마십시오. 스키마가 로드되지 않았다는 이유로 질문을 서술형 텍스트로 렌더링하는 것은 폴백이 아니라 버그입니다. Codex, Gemini, Pi에서는 이 체크리스트가 적용되지 않으며, `ToolSearch` 사전 로드 단계가 없습니다. (현재 Codex 런타임 모드에서 `request_user_input`을 사용할 수 없는 경우 아래 설명된 번호 리스트 폴백을 사용하십시오.)
- **라우팅 질문.** 플랫폼의 차단 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 묻습니다. 질문: `What should the agent do with the remaining N findings?` — "나(me/I)"가 아닌 "에이전트(the agent)"를 지칭하는 3인칭 시점을 사용하십시오. 옵션:

  ```
  (A) Review each finding one by one — accept the recommendation or choose another action
  (B) Auto-resolve with best judgment — apply per-finding fixes the agent can defend, surface the rest
  (C) File a [TRACKER] ticket per finding without applying fixes
  (D) Report only — take no further action
  ```

  `references/tracker-defer.md`에 따라 옵션 C를 렌더링합니다: `confidence = high`이고 `named_sink_available = true`이면 `[TRACKER]`를 구체적인 이름으로 바꾸고 전체 라벨을 유지합니다 (예: `File a Linear ticket per finding without applying fixes`). `any_sink_available = true`이지만 `confidence = low`이거나 `named_sink_available = false`인 경우(`gh`를 통한 GitHub Issues가 폴백으로 작동 중임), 일반적인 라벨인 `File an issue per finding without applying fixes`를 사용합니다. 이는 `[TRACKER]` 토큰 교체가 아니라 라벨 전체 교체입니다. `any_sink_available = false`이면 **옵션 C를 완전히 생략**하고 이 체크아웃에 설정된 이슈 트래커(Linear, GitHub Issues 등이 조사되었으나 사용 불가)가 없음을 설명하는 한 줄을 질문에 추가하십시오. 개발자 청중을 대상으로 표현하십시오. `tracker sink` 같은 전문 용어를 피하고, 누락된 조각이 에이전트 플랫폼이 아니라 프로젝트별 설정임을 알 수 있게 `platform`이라는 단어를 피하십시오. 남은 세 가지 옵션(A, B, D)은 유지됩니다.

  `ToolSearch`가 플랫폼 질문 도구에 대해 명시적으로 일치 항목 없음을 반환하거나 도구 호출이 에러를 발생시키는 경우(예: `request_user_input`을 사용할 수 없는 Codex 편집 모드)에는 번호가 매겨진 텍스트 리스트 폴백이 적용됩니다. 에이전트가 단순히 도구를 아직 로드하지 않은 경우에는 적용되지 않습니다. 그럴 때는 지금 로드하십시오 (위의 검증 체크리스트 참조). 폴백이 적용되면 옵션을 번호 리스트로 제시하고 사용자의 응답을 기다리십시오. 질문을 조용히 건너뛰지 마십시오.

- **선택에 따른 할당 (Dispatch on selection).** 렌더링된 라벨 문자열이 아니라 옵션 문자(A / B / C / D)를 기준으로 라우팅합니다. 옵션 C 라벨은 트래커 감지 신뢰도에 따라 달라지며(`[TRACKER]` 이름 포함, 일반적인 이슈 라벨 사용 또는 아예 생략 — `references/tracker-defer.md` 참조), 옵션 A / B / D는 각각 하나의 표준 라벨을 가집니다. 문자는 안정적인 할당 신호입니다. 아래 표준 라벨은 문서용으로만 표시됩니다. 옵션 C가 일반 라벨로 렌더링된 낮은 신뢰도의 실행도 명시된 트래커로 렌더링된 높은 신뢰도의 실행과 동일한 브랜치로 라우팅됩니다.
  - (A) `Review each finding one by one` — **첫 번째 발견 사항을 제시하기 전에 `references/walkthrough.md`를 전체적으로 읽으십시오.** 이는 발견 사항별 제시 형식과 옵션 메뉴에 대한 표준 명세입니다. 기억에 의존해 즉흥적으로 하지 마십시오. 형식을 바꾸지 마십시오. 커스텀 옵션 변형을 만들지 마십시오. 그 후 발견 사항별 워크스루 루프에 진입합니다. 결정 처리:
    - 사용자가 `Apply`를 선택하면 루프 종료 시 할당을 위해 수정 사항을 큐에 넣습니다. 즉시 적용하지 마십시오.
    - 사용자가 `Defer`를 선택하면 `references/tracker-defer.md`를 통해 즉시 티켓을 생성합니다.
    - 사용자가 `Skip` 또는 `Acknowledge`를 선택하면 조치 없음으로 기록합니다.
    - 사용자가 '나머지에 대해 최선의 판단으로 자동 해결' 옵션을 선택하면 루프를 종료하고 (스테이징된 Apply 세트 ∪ 남은 결정되지 않은 발견 사항)의 합집합에 대해 **한 번의** 수정 패스를 할당합니다. 이 브랜치에는 루프 종료 후 두 번째 할당이 없으므로 "하나의 수정 도구, 일관된 트리" 계약이 유지됩니다.

    사용자가 '나머지 자동 해결' 옵션을 호출하지 않고 모든 발견 사항을 검토하면 루프 종료 시(Step 3) 스테이징된 Apply 세트에 대해 하나의 수정 도구 서브 에이전트를 할당합니다. 할당 후 통합 완료 보고서를 출력합니다.
  - (B) `Auto-resolve with best judgment — apply per-finding fixes the agent can defend, surface the rest` — 대기 중인 전체 조치 세트(`gated_auto` + `manual` + `advisory`)에 대해 즉시 수정 도구 서브 에이전트(Step 3)를 할당합니다. Stage 5b 검증자 사전 패스가 없습니다. 벌크 프리뷰 승인 게이트가 없습니다. 수정 도구는 구체적인 `suggested_fix`가 있는 항목을 적용하고, 자문 항목에 대해서는 아무 작업도 하지 않으며, 수정을 깨끗하게 적용할 수 없거나(또는 인용된 근거가 더 이상 코드와 일치하지 않는) 항목은 한 줄의 사유와 함께 `failed` 버킷으로 라우팅합니다.

    **수정 도구가 반환된 후의 순서는 다음과 같습니다:**
    1. **`failed`가 비어 있는 경우:** 통합 완료 보고서를 출력하고 Step 5의 게이팅 규칙에 따라 진행합니다. 질문이 발생하지 않습니다.
    2. **`failed`가 비어 있지 않은 경우:** 실행 후 실패 처리 질문을 **먼저** 던집니다. 사용자가 실패 버킷을 해결하기 전에 보고서를 출력하면 최종 조치 상태가 변경되었으므로(티켓 생성이나 워크스루 모두 최종 상태를 바꿈) 보고서가 오래되었거나 중복될 수 있습니다. 질문: `N findings could not be auto-resolved. What should the agent do with them?` 세 가지 옵션:
       - `File tickets for these` — 실패 세트를 `references/tracker-defer.md` Interactive 모드를 통해 라우팅합니다. 캐시된 트래커 감지 튜플이 `any_sink_available = false`를 보고하면 이 옵션을 생략하고, 이 체크아웃에 설정된 이슈 트래커가 없음을 설명하는 한 줄을 질문에 추가하십시오. 개발자 청중을 대상으로 표현하고 `tracker sink`나 `platform` 같은 용어를 피하십시오.
       - `Walk through these one at a time` — 실패 세트로 범위를 좁혀 워크스루 루프에 재진입합니다. 각 발견 사항의 권장 조치는 Stage 5 step 6b 매핑을 통해 재계산됩니다: `suggested_fix`가 있는 항목은 Apply를 권장합니다 (사용자가 Apply를 선택하면 인메모리 Apply 세트에 합류하며, 워크스루 종료 시 해당 항목들에 대해서만 집중 수정 패스를 할당함). `suggested_fix`가 없는 항목은 Defer를 권장합니다 (Apply는 제공되지 않으며 메뉴는 Defer / Skip / `Auto-resolve with best judgment on the rest`입니다).
       - `Ignore — leave them in the report` — 실패 리스트를 보고서에 잔여 실행 가능 작업으로 기록합니다. 추가 조치 없음.

       사용자의 선택이 실행된 후(티켓 생성 완료, 워크스루 완료 또는 무시 기록 후) 통합 완료 보고서를 출력합니다. 보고서는 티켓 생성이나 워크스루 재진입 도중 적용된 추가 수정 사항을 포함하여 최종 상태를 반영합니다.

    번호 리스트 폴백은 `ToolSearch`가 명시적으로 일치 항목 없음 또는 도구 호출 에러를 반환할 때 적용됩니다. 질문을 조용히 건너뛰지 마십시오.

  - (C) `File a [TRACKER] ticket per finding without applying fixes` (또는 명시된 트래커 라벨이 사용되지 않은 경우 일반적인 `File an issue per finding without applying fixes`) — 먼저 대기 중인 모든 발견 사항에 대해 Stage 5b 검증을 실행합니다. 검증자가 거부한 발견 사항은 Coverage에 기록된 사유와 함께 폐기됩니다. 그 후 생존한 모든 발견 사항을 티켓 생성 버킷에 담아 `references/bulk-preview.md`를 로드합니다. `Proceed` 시 모든 발견 사항을 `references/tracker-defer.md`를 통해 라우팅하며 수정 사항은 적용되지 않습니다. `Cancel` 시 이 라우팅 질문으로 돌아옵니다. 통합 완료 보고서를 출력합니다.
  - (D) `Report only — take no further action` — 할당 단계를 진행하지 않습니다. 완료 보고서를 출력한 후 Step 5의 게이팅 규칙(`fixes_applied_count > 0`인 경우)에 따라 진행합니다. 이번 실행에서 수정 사항이 적용되지 않았다면 보고서 후 중단합니다.

- 워크스루의 완료 보고서, 베스트 저지먼트 / 티켓 생성 완료 보고서 및 잔여 사항 없음 완료 요약은 모두 `references/walkthrough.md`에 정의된 통합 완료 보고서 구조를 따릅니다. 모든 종료 경로에서 동일한 구조를 사용하십시오.

**Autofix 모드**

- 질문하지 않습니다.
- `safe_auto -> review-fixer` 큐만 적용합니다.
- `gated_auto`, `manual`, `human`, `release` 항목은 미해결 상태로 둡니다.
- 최종 소유자가 `downstream-resolver`인 미해결 실행 가능 발견 사항에 대해서만 잔여 작업을 준비합니다.

**Report-only 모드**

- 질문하지 않습니다.
- 수정 도구 큐를 구축하지 않습니다.
- 실행 결과물을 작성하지 않습니다.
- Stage 6 이후 중단합니다. 모든 것이 보고서에 남습니다.

**Headless 모드**

- 질문하지 않습니다.
- `safe_auto -> review-fixer` 큐만 단일 패스로 적용합니다. 제한된 횟수의 재리뷰 루프(Step 3)에 진입하지 마십시오. 하나의 수정 도구 서브 에이전트를 할당하고 수정을 적용한 후 Step 4로 직접 진행합니다.
- `gated_auto`, `manual`, `human`, `release` 항목은 미해결 상태로 두며 구조화된 텍스트 출력에 나타납니다.
- 대화형 보고서 대신 headless 출력 봉투(Stage 6 참조)를 출력합니다.
- 실행 결과물을 작성합니다 (Step 4). 티켓을 생성하거나 작업을 외부화하지 않습니다. 이는 호출자의 몫입니다.
- 구조화된 텍스트 출력과 "Review complete" 신호 후 중단합니다. 커밋/푸시/PR 없음.

#### Step 3: 하나의 수정 도구로 수정 적용

- 현재 체크아웃의 현재 수정 큐를 위해 **정확히 하나의** 수정 도구 서브 에이전트를 할당합니다. 해당 수정 도구는 승인된 모든 변경 사항을 적용하고 일관된 트리에서 관련 타겟 테스트를 단일 패스로 실행합니다.
- 동일한 체크아웃에 대해 여러 수정 도구를 병렬로 할당하지 마십시오. 병렬 수정 도구는 격리된 worktree/브랜치와 신중한 머지백(mergeback)이 필요합니다.
- 동일한 체크아웃에서 브라우저 테스트와 동시에 수정 리뷰 라운드를 시작하지 마십시오. 두 작업 모두를 원하는 미래의 오케스트레이터는 병렬 단계 동안 `mode:report-only`를 실행하거나 수정 리뷰를 자체 체크아웃/worktree로 격리해야 합니다.

**호출자 경로에 따른 큐 계약 (Queue contract by caller path):**

수정 도구는 호출자에 따라 두 가지 형태의 큐를 허용합니다.

- **동질적인 큐 (autofix, headless, 워크스루 Apply 세트):** 모든 항목이 `safe_auto -> review-fixer`(autofix, headless)이거나, 모든 항목이 구체적인 `suggested_fix`를 가지고 있습니다(사용자가 각 발견 사항에서 Apply를 선택한 워크스루 Apply 세트). 수정 도구는 각 항목을 적용합니다. **워크스루 Apply 세트를 위한 방어적 보호책:** 워크스루는 `suggested_fix`가 없는 발견 사항에 대해 Apply 옵션을 억제하며(`references/walkthrough.md` 참조) 실행 후 실패 처리 재진입 시에도 마찬가지입니다. 따라서 이 큐는 일반적인 실행에서 그런 항목을 포함하지 않아야 합니다. 만약 포함되어 있다면 정의되지 않은 적용을 시도하는 대신 '리뷰어가 제안한 수정 사항 없음' 사유와 함께 `failed`로 라우팅하십시오 (이질적인 큐의 처리 방식과 동일). autofix 및 headless 호출자는 영향을 받지 않으며 `safe_auto` 항목만 처리합니다.
- **이질적인 큐 (베스트 저지먼트 경로 — 대화형 옵션 B 및 워크스루의 '나머지 자동 해결'):** 큐에는 `gated_auto`, `manual`, `advisory` 발견 사항이 섞여 있습니다. 각 항목은 `autofix_class`, 심각도, file:line, 제목, `suggested_fix` (null일 수 있음), `why_it_matters`, `evidence`를 포함합니다. 수정 도구는 각 항목을 네 가지 버킷 중 하나로 라우팅합니다. 라우팅 카테고리는 고정되어 있으며, 실패 사유 문자열은 실행 후 질문의 프레임(`N findings could not be auto-resolved...`)이 사용자에게 의미 있게 읽히도록 충분히 구체적이어야 합니다. 더 구체적인 내용이 없는 경우 아래의 기본 문구를 사용하십시오. 해당 항목이 왜 적용되지 않았는지(예: `의도 확인 필요; 필드 축소가 의도된 것입니까, 아니면 클라이언트가 여전히 전체 페이로드를 필요로 합니까?`가 일반적인 기본값보다 유용함)를 보여주는 상세하고 발견 사항별인 사유를 선호하십시오.
  - **`suggested_fix`가 있는 `safe_auto` / `gated_auto` / `manual`:** 가벼운 근거 일치 확인을 수행합니다 (`file:line`의 인용된 코드가 페르소나의 근거와 여전히 유사한지 확인. 구체적으로: 근거에 포함된 식별자나 특징적인 토큰 중 최소 하나가 인용된 위치에 나타나고 줄이 삭제되지 않았는지 확인). 확인이 통과되면 수정을 적용합니다. 깨끗하게 적용되면 `applied`로 라우팅합니다. 수정 적용 실패(줄 이동, 충돌하는 편집, 문법 이슈) 시 구체적인 사유와 함께 `failed`로 라우팅합니다. 더 나은 설명이 없으면 기본 문구 `fix did not apply cleanly: <error>`를 사용합니다.
  - **`suggested_fix`가 없는 `gated_auto` 또는 `manual`:** `failed`로 라우팅합니다. 더 나은 설명이 없으면 기본 문구 `no fix proposed by reviewer`를 사용합니다. `manual`의 경우 이 신호는 페르소나가 해당 발견 사항이 리뷰 외부의 교차 팀 입력이나 컨텍스트가 필요하다고 판단했음을 나타냅니다. 페르소나의 `why_it_matters`나 `evidence`에 명시된 구체적인 결정 사항(의도 모호성, 계약 결정, 디자인 선택)을 명명하는 더 풍부한 사유가 유용합니다. `gated_auto`의 경우 이는 방어적인 케이스입니다 (페르소나는 일반적으로 구체적인 수정 사항 없이 `gated_auto`를 생성해서는 안 됨). 적용-또는-실패 계약을 유지하기 위해 무시하지 말고 `failed`에 노출하십시오.
  - **자문 항목 (`autofix_class: advisory`):** 작업 없음. `advisory`로 라우팅합니다 (확인된 것으로 기록됨).
  - **근거 일치 확인 실패:** `failed`로 라우팅합니다. 더 나은 설명이 없으면 기본 문구 `evidence no longer matches code at <file:line>`을 사용합니다. 이는 위양성 케이스이며, 발견 사항이 지적한 내용이 그 사이 변경되었거나 이미 처리되었습니다.

**베스트 저지먼트 경로는 단일 패스입니다.** `max_rounds: 2` 재리뷰 루프가 없습니다. 수정 도구가 반환된 후 오케스트레이터는 Step 2 Interactive 옵션 B의 후속 순서를 따릅니다: `failed` 버킷이 비어 있으면 통합 완료 보고서를 즉시 출력하고, 비어 있지 않으면 실행 후 실패 처리 질문을 먼저 던지고 사용자의 선택을 실행한 후 보고서를 출력하여 최종 조치 상태를 반영합니다.

**다른 경로들은 제한된 횟수의 루프를 유지합니다.** autofix 및 워크스루 Apply 세트의 경우 수정 사항이 적용된 후 변경된 범위만 재리뷰하고, 루프를 `max_rounds: 2`로 제한하며, 두 번째 라운드 후에도 이슈가 남으면 잔여 작업으로 전달하거나 미해결로 보고합니다.

**검증 (Verification).** 적용된 발견 사항 중 `requires_verification: true`인 항목이 있으면, 수정 도구는 `applied`로 선언하기 전에 해당 항목에 대한 타겟 검증(집중 테스트 또는 운영 확인)을 실행합니다. 검증 실패 시 `failed`로 라우팅합니다. 더 나은 설명이 없으면 기본 문구 `verification failed: <test-name>`을 사용합니다 (예: `verification failed: payment_spec timed out after 30s`가 일반적인 기본값보다 유용함). 이는 모든 경로에 적용됩니다.

**수정 도구 반환 형태 (베스트 저지먼트 경로).** 수정 도구는 `{applied, failed, advisory}` 파티션을 반환하며, 각 항목에는 발견 사항 식별자, 원래 `autofix_class`, 심각도, file:line 및 (실패 시) 한 줄의 사유가 포함됩니다. 오케스트레이터는 이 파티션을 사용하여 통합 완료 보고서를 작성하고 실행 후 실패 처리 질문을 제어합니다.

#### Step 4: 결과물 발행 및 다운스트림 전달

- Interactive, autofix, headless 모드에서 `/tmp/compound-engineering/ce-code-review/<run-id>/` 아래에 실행당 결과물을 작성하며 다음을 포함합니다.
  - 합성된 발견 사항 (Stage 5의 머지 출력)
  - 적용된 수정 사항
  - 잔여 실행 가능 작업
  - 자문 전용 출력물
  에이전트별 상세 JSON 파일(`{reviewer_name}.json`)은 Stage 4 할당 시점부터 이미 이 디렉토리에 존재합니다.
- 발견 사항과 함께 `metadata.json`도 작성하여 다운스트림 스킬(예: `ce-polish-beta`)이 결과물이 현재 브랜치 및 HEAD와 일치하는지 확인할 수 있게 합니다. 최소 필드:
  ```json
  {
    "run_id": "<run-id>",
    "branch": "<할당 시점의 git branch --show-current>",
    "head_sha": "<할당 시점의 git rev-parse HEAD>",
    "verdict": "<Ready to merge | Ready with fixes | Not ready>",
    "completed_at": "<ISO 8601 UTC 타임스탬프>"
  }
  ```
  할당 시점(수정이 적용되기 전)에 `branch`와 `head_sha`를 캡처하고 평결이 확정된 후 파일을 작성하십시오. 이 파일은 추가적인 정보이며, 이 필드가 없는 이전 결과물들도 여전히 유효하며 다운스트림 스킬은 파일 mtime으로 폴백합니다.
- Autofix 모드에서는 실행 결과물 자체가 전달물입니다. 오케스트레이터는 결과물의 잔여 실행 가능 작업을 읽어 적절히 라우팅합니다. 스킬 자체는 autofix에서 티켓을 생성하거나 사용자에게 프롬프트를 띄우지 않습니다.
- Interactive 모드는 `references/tracker-defer.md`를 통해 잔여 실행 가능 작업을 외부화(명시된 트래커 -> `gh`를 통한 GitHub Issues)하도록 제안할 수 있지만, 리뷰를 마치는 데 필수 사항은 아닙니다.

#### Step 5: 최종 다음 단계

**Interactive 모드 전용.** 수정-리뷰 사이클이 완료되면(깨끗한 평결 또는 사용자가 중단을 선택함), 진입 모드에 따라 다음 단계를 제안합니다. 확인된 경우 Stage 1의 리뷰 베이스/기본 브랜치를 재사용하십시오. `main`/`master`만 하드코딩하지 마십시오.

**게이트는 라우팅 옵션이 아니라 이번 실행에서 적용된 총 수정 횟수입니다.** 전체 Interactive 호출 동안 `fixes_applied_count`를 추적하십시오. 이 카운터에는 라우팅 질문 전 자동으로 적용된 `safe_auto` 수정 사항(Step 2 Interactive 모드 참조)과 라우팅 옵션 A(워크스루) 또는 옵션 B(베스트 저지먼트)에 의해 실행된 모든 Apply 결정이 포함됩니다. 라우팅 옵션 C(티켓 생성) 및 D(보고만 수행)는 이 카운터에 아무것도 더하지 않습니다. Apply 없이 Skip / Defer / Acknowledge로만 끝난 워크스루나 모든 발견 사항이 `failed` 또는 `advisory`로 라우팅된 베스트 저지먼트 할당도 마찬가지입니다.

Step 5는 `fixes_applied_count > 0`일 때만 실행됩니다. 카운터가 0인 경우(적용된 `safe_auto` 수정이 없고 라우팅 경로에서도 추가 Apply가 발생하지 않음) Step 5를 완전히 건너뛰고 완료 보고서 후 종료하십시오. 작업 트리에 아무런 변화가 없는데 "수정 사항을 푸시하시겠습니까?"라고 묻는 것은 일관성이 없습니다.

일반적인 결과:

- `safe_auto` 수정을 생성했고 사용자가 어떤 라우팅 옵션이든 선택함 → Step 5 실행 (`safe_auto` 패스만으로 카운터 > 0).
- `safe_auto` 수정이 없고 사용자가 옵션 C나 D를 선택함 → Step 5 건너뜀.
- `safe_auto` 수정이 없고 워크스루 / 베스트 저지먼트가 Apply 없이 끝남 → Step 5 건너뜀.
- `safe_auto` 후 `gated_auto` / `manual`이 남지 않은 케이스(zero-remaining)에서 최소 하나의 `safe_auto` 수정이 있음 → Step 5 실행. 라우팅 질문은 없었지만 카운터는 > 0입니다.

- **PR 모드 (PR 번호/URL로 진입):**
  - **Push fixes** -- 기존 PR 브랜치에 커밋 푸시
  - **Exit** -- 지금은 종료
- **브랜치 모드 (PR이 없는 기능 브랜치이며, 확인된 리뷰 베이스/기본 브랜치가 아님):**
  - **Create a PR (Recommended)** -- 푸시하고 풀 리퀘스트 열기
  - **Continue without PR** -- 브랜치 유지
  - **Exit** -- 지금은 종료
- **확인된 리뷰 베이스/기본 브랜치에 있는 경우:**
  - **Continue** -- 다음 단계로 진행
  - **Exit** -- 지금은 종료

"Create a PR"인 경우: 먼저 `git push --set-upstream origin HEAD`로 브랜치를 게시한 다음, 브랜치 변경 사항에서 도출된 제목과 요약을 사용하여 `gh pr create`를 실행합니다.
"Push fixes"인 경우: `git push`로 브랜치를 푸시하여 기존 PR을 업데이트합니다.

**Autofix, report-only, headless 모드:** 보고서 출력, 결과물 발행 및 잔여 작업 전달 후 중단합니다. 커밋, 푸시 또는 PR 생성을 수행하지 않습니다.

## 폴백 (Fallback)

플랫폼이 병렬 서브 에이전트를 지원하지 않으면 리뷰어를 순차적으로 실행합니다. 플랫폼이 서브 에이전트를 지원하지만 활성 동시성을 제한하는 경우, 할당 실패를 리뷰어 실패로 처리하는 대신 Stage 4의 제한된 큐 규칙을 사용하십시오. 그 외의 모든 사항(단계, 출력 형식, 머지 파이프라인)은 동일하게 유지됩니다.

---

## 포함된 참조 (Included References)

### 페르소나 카탈로그

@./references/persona-catalog.md

### 서브 에이전트 템플릿

@./references/subagent-template.md

### Diff 범위 규칙

@./references/diff-scope.md

### 발견 사항 스키마

@./references/findings-schema.json

### 리뷰 출력 템플릿

@./references/review-output-template.md
