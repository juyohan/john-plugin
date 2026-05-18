# 코드 리뷰 출력 템플릿 (Code Review Output Template)

합성된 리뷰 결과물을 제시할 때 이 **정확한 형식**을 사용하십시오. 발견 사항은 심각도별 그룹화. 파이프 구분 마크다운 테이블 사용. 테이블 셀 내 리터럴 `|`는 `\|`로 이스케이프.

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
| 1 | `orders_controller.rb:42` | Ownership check missing on export lookup | `gated_auto -> downstream-resolver` | Defer via tracker |
| 3 | `export_service.rb:91` | Pagination contract needs a broader API decision | `manual -> downstream-resolver` | Defer via tracker |

### Pre-existing Issues

| # | File | Issue | Reviewer |
|---|------|-------|----------|
| 1 | `orders_controller.rb:12` | Broad rescue masking failed permission check | correctness |

### Coverage

- Suppressed: 2 findings below anchor 75
- Residual risks: No rate limiting on export endpoint
- Testing gaps: No test for concurrent export requests

---

> **Verdict:** Ready with fixes
>
> **Reasoning:** 1 critical auth bypass must be fixed.
>
> **Fix order:** P0 auth bypass -> P1 memory/pagination -> P2 error handling
```

## 포맷 규칙

- **파이프 구분 테이블** — ASCII 박스 문자나 가로선 구분 금지 (판정 전 보고서 수준 `---`는 유지)
- **테이블 셀 내 `|` 이스케이프** — `\|`로 작성. 미이스케이프 파이프는 열을 손상시킴
- **심각도별 섹션** — `### P0 -- Critical`, `### P1 -- High`, `### P2 -- Moderate`, `### P3 -- Low`. 빈 섹션 생략.
- **안정적 순차 번호** — 정렬 후 한 번 할당. 심각도 섹션이 바뀌어도 계속. Residual에서 동일 번호 재사용.
- **Confidence 열** — 정수(`50`, `75`, `100`)로 표시. 부동소수점 금지.
- **Route 열** — `` `<autofix_class> -> <owner>` `` 형식.
- **Applied Fixes** — 수정 단계가 실행된 경우에만 포함.
- **Residual Actionable Work** — 미해결 실행 가능 발견 사항이 있을 때만 포함.
- **Pre-existing** — 별도 테이블, Confidence 열 제외.
- **Coverage** — 억제된 수, 잔존 리스크, 테스트 갭, 실패한 리뷰어 포함.
- **판정** — blockquote 형식. Verdict / Reasoning / Fix order 포함.

## Headless 모드 포맷

`mode:headless`에서는 파이프 테이블 대신 구조화된 텍스트 엔벨로프 사용:
- 발견 사항: `[severity][autofix_class -> owner] File: <file:line> -- <title>` + 들여쓴 Why/Evidence/Suggested fix
- autofix_class별 그룹화 (gated-auto, manual, advisory), 각 그룹 내 심각도순 정렬
- 판정은 출력 상단 헤더에 위치
- `requires_verification: true` 발견 사항에 `[needs-verification]` 마커
- 마지막 라인: "Review complete"
