# 코드 리뷰 출력 템플릿 (Code Review Output Template)

합성된 리뷰 결과물을 제시할 때 이 **정확한 형식**을 사용하십시오. 발견 사항은 리뷰어별이 아닌 심각도(severity)별로 그룹화됩니다.

**중요:** 파이프 구분 마크다운 테이블(`| col | col |`)을 사용하십시오. ASCII 박스 그리기 문자를 사용하지 마십시오.

**중요:** 테이블 셀 안의 리터럴 파이프 문자는 이스케이프하십시오. 발견 사항 제목, 이슈 설명, 코드 스니펫, 정규식 패턴 또는 구분된 문자열 예시(예: `userName + "|" + groups`와 같은 캐시 키 예시)에 나타나는 모든 `|`는 이스케이프되지 않은 파이프에 의해 열 경계가 결정되도록 `\|`로 작성해야 합니다. 이스케이프되지 않은 파이프는 셀을 여러 열로 나누어 해당 행의 `Reviewer`, `Confidence`, `Route` 값을 손상시킵니다.

## 예시

```markdown
## Code Review Results

**Scope:** merge-base with the review base branch -> working tree (14 files, 342 lines)
**Intent:** Add order export endpoint with CSV and JSON format support
**Mode:** autofix

**Reviewers:** correctness, testing, maintainability, security, api-contract
- security -- new public endpoint accepts user-provided format parameter
- api-contract -- new /api/orders/export route with response schema

### P0 -- Critical

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 1 | `orders_controller.rb:42` | User-supplied ID in account lookup without ownership check | security | 100 | `gated_auto -> downstream-resolver` |

### P1 -- High

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 2 | `export_service.rb:87` | Loads all orders into memory -- unbounded for large accounts | performance | 100 | `safe_auto -> review-fixer` |
| 3 | `export_service.rb:91` | No pagination -- response size grows linearly with order count | api-contract, performance | 75 | `manual -> downstream-resolver` |

### P2 -- Moderate

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 4 | `export_service.rb:45` | Missing error handling for CSV serialization failure | correctness | 75 | `safe_auto -> review-fixer` |

### P3 -- Low

| # | File | Issue | Reviewer | Confidence | Route |
|---|------|-------|----------|------------|-------|
| 5 | `export_helper.rb:12` | Format detection could use early return instead of nested conditional | maintainability | 75 | `advisory -> human` |

### Applied Fixes

- `safe_auto`: Added bounded export pagination guard and CSV serialization failure test coverage in this run

### Residual Actionable Work

| # | File | Issue | Route | Next Step |
|---|------|-------|-------|-----------|
| 1 | `orders_controller.rb:42` | Ownership check missing on export lookup | `gated_auto -> downstream-resolver` | Defer via tracker (requires explicit approval before behavior change) |
| 3 | `export_service.rb:91` | Pagination contract needs a broader API decision | `manual -> downstream-resolver` | Defer via tracker with contract and client impact details |

### Pre-existing Issues

| # | File | Issue | Reviewer |
|---|------|-------|----------|
| 1 | `orders_controller.rb:12` | Broad rescue masking failed permission check | correctness |

### Learnings & Past Solutions

- [Known Pattern] `docs/solutions/export-pagination.md` -- previous export pagination fix applies to this endpoint

### Agent-Native Gaps

- New export endpoint has no CLI/agent equivalent -- agent users cannot trigger exports

### Schema Drift Check

- Clean: schema.rb changes match the migrations in scope

### Deployment Notes

- Pre-deploy: capture baseline row counts before enabling the export backfill
- Verify: `SELECT COUNT(*) FROM exports WHERE status IS NULL;` should stay at `0`
- Rollback: keep the old export path available until the backfill has been validated

### Coverage

- Suppressed: 2 findings below anchor 75 (1 at anchor 50, 1 at anchor 25)
- Residual risks: No rate limiting on export endpoint
- Testing gaps: No test for concurrent export requests

---

> **Verdict:** Ready with fixes
>
> **Reasoning:** 1 critical auth bypass must be fixed. The memory/pagination issues (P1) should be addressed for production safety.
>
> **Fix order:** P0 auth bypass -> P1 memory/pagination -> P2 error handling if straightforward
```

## 안티 패턴 (Anti-patterns)

다음과 같은 결과물을 생성하지 마십시오. 아래는 잘못된 예시입니다:

```markdown
Findings

Sev: P1
File: foo.go:42
Issue: Some problem description
Reviewer(s): adversarial
Confidence: 75
Route: advisory -> human
────────────────────────────────────────
Sev: P2
File: bar.go:99
Issue: Another problem
```

실패 사유: 파이프 구분 테이블 없음, 심각도별 `###` 헤더 없음, 박스 그리기 가로선 사용, 번호가 매겨진 발견 사항 없음, `## Code Review Results` 제목 없음, 판정(verdict)이 인용구(blockquote) 형식이 아님. 항상 위의 예시와 같은 테이블 형식을 사용하십시오.

## 포맷 규칙

- **발견 사항에 대한 파이프 구분 마크다운 테이블** — ASCII 박스 그리기 문자나 항목 간 가로선 구분 기호를 사용하지 마십시오 (판정 전의 보고서 수준 가로선 `---`는 여전히 필요함).
- **테이블 셀 내 리터럴 `|` 이스케이프** — 발견 사항 제목, 이슈 설명, 코드 스니펫, 정규식 패턴 또는 구분된 문자열 예시 내부의 모든 `|`는 `\|`로 작성해야 합니다. 이스케이프되지 않은 파이프는 열 구분 기호로 해석되어 행의 `Reviewer`, `Confidence`, `Route` 열을 손상시킵니다. 특히 캐시 키 구분 기호 예시, 정규식 교체, 발견 사항 내부의 논리 OR 연산자에 적용됩니다.
- **심각도별 그룹화 섹션** — `### P0 -- Critical`, `### P1 -- High`, `### P2 -- Moderate`, `### P3 -- Low`. 비어 있는 심각도 레벨은 생략합니다.
- **안정적인 순차적 발견 사항 번호** — 정렬 후 한 번 번호를 할당하고, 심각도 섹션이 바뀌어도 계속 이어서 사용하십시오. 'Residual Actionable Work'에서 발견 사항이 반복될 때도 동일한 번호를 재사용하십시오. 각 심각도나 라우트 버킷마다 `1`부터 다시 시작하지 마십시오.
- **코드 리뷰 이슈에 대해 항상 file:line 위치 포함**
- **Reviewer 열**은 해당 이슈를 지적한 페르소나를 보여줍니다. 여러 리뷰어는 리뷰어 간의 합의를 의미합니다.
- **Confidence 열**은 발견 사항의 앵커(anchor)를 정수(`50`, `75`, 또는 `100`)로 표시합니다. 부동 소수점으로 렌더링하지 마십시오.
- **Route 열**은 합성된 처리 결정을 ``<autofix_class> -> <owner>``.
- **헤더**에는 범위(scope), 의도(intent) 및 조건부별 정당성을 포함한 리뷰어 팀이 포함됩니다.
- **Mode 라인** — `interactive`, `autofix`, `report-only` 또는 `headless`를 포함합니다.
- **Applied Fixes 섹션** — 이 리뷰 호출에서 수정 단계가 실행된 경우에만 포함합니다.
- **Residual Actionable Work 섹션** — 해결되지 않은 실행 가능한 발견 사항이 나중에 작업을 위해 전달된 경우에만 포함합니다.
- **Pre-existing 섹션** — 별도의 테이블로 작성하며, 신뢰도(confidence) 열은 제외합니다 (정보 제공용임).
- **Learnings & Past Solutions 섹션** — ce-learnings-researcher의 결과로, docs/solutions/ 파일 링크를 포함합니다.
- **Agent-Native Gaps 섹션** — ce-agent-native-reviewer의 결과입니다. 갭이 발견되지 않으면 생략합니다.
- **Schema Drift Check 섹션** — ce-schema-drift-detector의 결과입니다. 에이전트가 실행되지 않았으면 생략합니다.
- **Deployment Notes 섹션** — ce-deployment-verification-agent의 주요 체크리스트 항목입니다. 에이전트가 실행되지 않았으면 생략합니다.
- **Coverage 섹션** — 억제된(suppressed) 개수, 잔존 리스크, 테스트 갭, 실패한 리뷰어를 포함합니다.
- **요약**은 판정(verdict), 추론(reasoning) 및 수정 순서에 대해 인용구(blockquote)를 사용합니다.
- **가로선**(`---`)은 발견 사항과 판정을 구분합니다.
- **각 섹션에 `###` 헤더 사용** — 일반 텍스트 헤더를 사용하지 마십시오.

## Headless 모드 포맷

`mode:headless`에서는 대화형 파이프 구분 테이블 보고서를 구조화된 텍스트 엔벨로프(envelope)로 교체합니다. Headless 포맷은 SKILL.md의 `### Headless output format` 섹션에 정의되어 있습니다. 대화형 포맷과의 주요 차이점:

- **파이프 구분 테이블 없음.** 발견 사항은 `[severity][autofix_class -> owner] File: <file:line> -- <title>` 라인 형식을 사용하며, Why/Evidence/Suggested fix 라인은 들여쓰기합니다.
- **심각도가 아닌 autofix_class별 그룹화** (gated-auto, manual, advisory). 각 그룹 내에서 발견 사항은 심각도별로 정렬됩니다.
- **판정이 헤더(출력 상단)에 위치**하여 프로그래밍 방식 호출자가 먼저 확인할 수 있도록 합니다.
- **`Artifact:` 라인**은 메타데이터 헤더에서 전체 실행 아티팩트 경로를 제공합니다.
- **`requires_verification: true`인 발견 사항에 `[needs-verification]` 마커 표시**.
- **발견 사항별 Evidence 라인 포함**.
- **완료 신호:** 마지막 라인에 "Review complete" 표시.
