# Document Review Output Template (문서 검토 출력 템플릿)

Interactive 모드에서 합성된 검토 발견 사항을 제시할 때 이 **정확한 형식**을 사용하십시오. 발견 사항은 검토자별이 아닌 심각도(severity)별로 그룹화됩니다.

**중요:** 파이프 구분 마크다운 테이블(`| col | col |`)을 사용하십시오. ASCII 박스 그리기 문자를 사용하지 마십시오.

**중요:** 테이블 셀 내의 리터럴 파이프 문자는 이스케이프 처리하십시오. 발견 사항의 섹션 참조, 이슈 설명, 코드 스니펫, 정규식 패턴 또는 구분된 문자열 예시 내에 나타나는 모든 `|`는 `\|`로 작성하여 열 경계가 이스케이프되지 않은 파이프에 의해서만 결정되도록 해야 합니다. 이스케이프되지 않은 파이프는 셀을 여러 열로 나누어 해당 행의 `Reviewer`, `Confidence`, `Tier` 값을 손상시킵니다.

이 템플릿은 Phase 4 대화형 프레젠테이션 — 라우팅 질문(`references/walkthrough.md`)이 실행되기 전에 사용자가 보게 되는 내용을 설명합니다. 헤드리스 모드(headless-mode) 엔벨로프는 `references/synthesis-and-presentation.md`(Phase 4 "Route Remaining Findings" 섹션)에 정의되어 있으며 이 템플릿과는 별개입니다.

**어휘 참고:** 내부 enum 값(`safe_auto`, `gated_auto`, `manual`, `FYI`)은 스키마 및 합성 파이프라인에서 사용됩니다. 사용자에게 렌더링되는 텍스트는 대신 일반 언어 레이블을 사용합니다: fixes(`safe_auto`용), proposed fixes(`gated_auto`용), decisions(`manual`용), FYI observations(`FYI`용). 아래 테이블의 `Tier` 열은 사용자가 합성 결정을 확인할 수 있도록 내부 enum 이름을 그대로 유지하는 유일한 곳입니다. 그 외의 모든 곳은 일반 언어로 표시됩니다.

**Confidence 열:** `Confidence` 열은 정수 앵커 값(`50`, `75` 또는 `100`)을 표시하며 소수점이나 퍼센트 기호는 절대 사용하지 않습니다. 앵커 `50` = 자문(advisory, FYI로 라우팅됨); 앵커 `75` = 확인됨, 실제로 발생할 것임; 앵커 `100` = 확실함, 증거가 직접적으로 확인해 줌. 앵커 `0` 및 `25`는 이 레이어 이전에 합성에 의해 제거되어 렌더링된 출력에 절대 나타나지 않습니다. 페르소나 간의 합의가 이루어지면 앵커 단계가 한 단계 격상됩니다. 이 경우 `Reviewer` 열에 해당 내용이 기록됩니다(예: `coherence, feasibility (+1 anchor)`).

## 예시 (Example)

```markdown
## Document Review Results

**Document:** docs/plans/2026-03-15-feat-user-auth-plan.md
**Type:** plan
**Reviewers:** coherence, feasibility, security-lens, scope-guardian
- security-lens -- plan adds public API endpoint with auth flow
- scope-guardian -- plan has 15 requirements across 3 priority levels

Applied 5 fixes. 4 items need attention (2 errors, 2 omissions). 2 FYI observations.

### Applied fixes

- Standardized "pipeline"/"workflow" terminology to "pipeline" throughout (coherence)
- Fixed cross-reference: Section 4 referenced "Section 3.2" which is actually "Section 3.1" (coherence)
- Updated unit count from "6 units" to "7 units" to match listed units (coherence)
- Added "update API rate-limit config" step to Unit 4 -- implied by Unit 3's rate-limit introduction (feasibility)
- Added auth token refresh to test scenarios -- required by Unit 2's token expiry handling (security-lens)

### P0 — Must Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 1 | Requirements Trace | Goal states "offline support" but technical approach assumes persistent connectivity | coherence | 100 | manual |

### P1 — Should Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 2 | Scope Boundaries | 8 of 12 units build admin infrastructure; only 2 touch stated goal | scope-guardian | 75 | manual |

#### Omissions

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 3 | Implementation Unit 3 | Plan proposes custom auth but does not mention existing Devise setup or migration path | feasibility | 100 | gated_auto |

### P2 — Consider Fixing

#### Omissions

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 4 | API Design | Public webhook endpoint has no rate limiting mentioned | security-lens | 75 | gated_auto |

### FYI Observations

Low-confidence observations surfaced without requiring a decision. Content advisory only.

| # | Section | Observation | Reviewer | Confidence |
|---|---------|-------------|----------|------------|
| 1 | Naming | Filename `plan.md` is asymmetric with command name `user-auth`; could go either way | coherence | 50 |
| 2 | Risk Analysis | Rollout-cadence decision may benefit from monitoring thresholds, though not blocking | scope-guardian | 50 |

### Residual Concerns

Residual concerns are issues the reviewers noticed but could not confirm at confidence anchor `50` or higher. These are not actionable; they appear here for transparency only and are not promoted into the review surface.

| # | Concern | Source |
|---|---------|--------|
| 1 | Migration rollback strategy not addressed for Phase 2 data changes | feasibility |

### Deferred Questions

| # | Question | Source |
|---|---------|--------|
| 1 | Should the API use versioned endpoints from launch? | feasibility, security-lens |

### Coverage

| Persona | Status | Findings | Auto | Proposed | Decisions | FYI | Residual |
|---------|--------|----------|------|----------|-----------|-----|----------|
| coherence | completed | 5 | 3 | 0 | 1 | 1 | 0 |
| feasibility | completed | 3 | 1 | 1 | 0 | 0 | 1 |
| security-lens | completed | 2 | 1 | 1 | 0 | 0 | 0 |
| scope-guardian | completed | 2 | 0 | 0 | 1 | 1 | 0 |
| product-lens | not activated | -- | -- | -- | -- | -- | -- |
| design-lens | not activated | -- | -- | -- | -- | -- | -- |

Dropped: 3 (anchors 0/25 suppressed)
Chains: 1 root with 2 dependents
Restated: 2 (residual/deferred items suppressed as duplicates of actionable findings)
```

## 섹션 규칙 (Section Rules)

- **요약 라인 (Summary line)**: 검토자 목록 다음에 항상 표시됩니다. 형식: "Applied N fixes. K items need attention (X errors, Y omissions). Z FYI observations." FYI 절이 0인 경우를 제외하고(아무것도 발견되지 않았다는 정보 자체가 의미가 있으므로) 수치가 0인 절은 생략합니다.
- **적용된 수정 사항 (Applied fixes)**: 자동으로 적용된 모든 수정 사항(`safe_auto` 티어)을 나열합니다. 수정의 실질적인 내용을 전달할 수 있을 정도로 충분한 세부 정보를 포함하십시오 — 특히 내용을 추가하거나 문서의 의미를 건드리는 수정의 경우 더욱 그렇습니다. 해당하는 수정 사항이 없으면 섹션을 생략합니다.
- **P0-P3 섹션**: 실행 가능한 발견 사항(`gated_auto` 또는 `manual`)이 있는 섹션만 포함합니다. 비어 있는 심각도 레벨은 생략합니다. 각 심각도 내에서 **Errors**와 **Omissions** 하위 헤더로 나눕니다. 해당 심각도에 해당 유형이 없으면 하위 헤더를 생략합니다. `Tier` 열은 발견 사항이 `gated_auto`(구체적인 수정안이 존재하며 워크스루에서 Apply 권장됨)인지 `manual`(사용자의 판단 필요)인지를 명시합니다.
- **FYI Observations**: `autofix_class`에 관계없이 신뢰도 앵커 `50`인 발견 사항입니다. 투명성을 위해 여기에 표시하며, 이들은 실행 가능하지 않으며 워크스루에 진입하지 않습니다. 해당하는 사항이 없으면 섹션을 생략합니다.
- **잔류 우려 사항 (Residual Concerns)**: 페르소나가 기록했지만 신뢰도 게이트 `50`을 넘지 못한 우려 사항입니다. 투명성을 위해 나열되지만 검토 화면으로 승격되지는 않습니다(합성 단계 3.4에 따라 페르소나 간 합의로 인한 격상은 이미 게이트를 통과한 발견 사항에 대해서만 실행됩니다). 해당하는 사항이 없으면 섹션을 생략합니다.
- **지연된 질문 (Deferred Questions)**: 나중 워크플로 단계를 위한 질문입니다. 해당하는 사항이 없으면 섹션을 생략합니다.
- **FYI / Residual / Deferred의 압축 렌더링 (높은 카운트 모드)**: 이 세 섹션의 합계가 **5개 이상**인 경우, 각 섹션을 한 줄 요약으로 축소하고 그 아래에 항목들을 촘촘한 불렛 리스트로 표시합니다(테이블 없음, 항목별 `Why` 설명 없음). 근거: 이 섹션들은 관찰용이지 결정을 강제하는 것이 아닙니다 — 내용이 너무 길어지면 상위의 실행 가능한 티어들을 가리게 됩니다. P0/P1/P2 실행 가능 발견 사항은 FYI/Residual/Deferred 항목이 아무리 많아도 항상 전체 렌더링됩니다. 합계가 4개 이하인 경우 각 섹션을 현재와 같이 렌더링합니다.
- **Coverage**: 항상 포함합니다. 모든 수치는 **합성 후(post-synthesis)** 기준입니다. **Findings**는 Auto + Proposed + Decisions + FYI의 합과 정확히 일치해야 합니다 — 중복 제거 과정에서 여러 페르소나에 걸친 발견 사항이 병합된 경우, 신뢰도 앵커가 가장 높은 페르소나의 몫으로 할당하고 다른 페르소나의 카운트를 줄입니다. **Residual** = 이 페르소나의 원시 출력물에 포함된 `residual_risks`의 수(잔류 우려 사항 섹션에 표시된 승격된 하위 집합이 아님)입니다. `Auto` 열은 앵커 `100`인 `safe_auto` 발견 사항을, `Proposed` 열은 앵커 `75` 또는 `100`인 `gated_auto` 발견 사항을, `Decisions` 열은 앵커 `75` 또는 `100`인 `manual` 발견 사항을, `FYI` 열은 `autofix_class`에 관계없이 앵커 `50`인 발견 사항을 카운트합니다. 앵커 `0` 또는 `25`인 발견 사항은 합성에 의해 누락되었으므로 어떤 열에도 나타나지 않습니다. 추가 열(예: `Dropped`, `Surviving`)을 임의로 만들지 마십시오. 위의 컬럼 스키마가 표준 세트입니다.
- **Coverage 각주 라인** (선택 사항, 0이 아닐 때 테이블 아래에 표시): 합성 3.2에서 발견 사항이 누락된 경우 `Dropped: N (anchors 0/25 suppressed)`. 전제 조건 의존성 체인이 있는 경우 `Chains: N root(s) with M dependents`. 합성 3.9에서 재진술이 억제된 경우 `Restated: N (residual/deferred items suppressed as duplicates of actionable findings)`. 이 각주들은 요약 라인이나 페르소나별 열이 아닌, 페르소나별 형식에 맞지 않는 횡단적 카운트를 위한 표준 위치입니다. 순서: `Dropped:`, `Chains:`, `Restated:` 순으로 각 줄에 표시합니다. 카운트가 0인 각주는 생략합니다.

## 체인 렌더링 규칙 (Chain-Rendering Rules)

합성 단계 3.5c의 전제 조건 의존성 체인은 루트(root)와 종속 항목(dependent)을 표시합니다. 렌더링은 합성 참조 문서에 기록된 것과 동일한 카운트 불변성(invariant)을 따릅니다. 이 템플릿은 대화형 출력이 헤드리스 엔벨로프와 달라지지 않도록 규칙을 재진술합니다.

- **종속 항목은 루트 아래에서만 렌더링됩니다.** 발견 사항에 `dependents`가 있는 경우, 루트를 원래 심각도 위치(해당 P-티어 Errors 또는 Omissions 테이블)에 렌더링합니다. 루트의 테이블 행 바로 아래에 들여쓰기된 `Dependents (N)` 하위 블록을 출력하고 각 종속 항목의 `# | Section | Issue | Reviewer | Confidence | Tier` 항목을 나열합니다. 종속 항목은 자신의 심각도 위치에 나타나서는 안 됩니다. `depends_on`과 `dependents`가 모두 없는 발견 사항은 현재와 같이 렌더링됩니다.
- **카운트 불변성.** Coverage의 `Findings` 열은 계속해서 Auto + Proposed + Decisions + FYI의 합과 일치해야 합니다. 각 발견 사항은 정확히 한 번만 카운트됩니다. 종속 항목은 할당된 버킷(`Auto` / `Proposed` / `Decisions` / `FYI`)에 카운트되지만, 자신의 심각도 위치에서 렌더링되지는 않습니다. 정보의 근처는 각 루트의 Step-4 이후 `dependents` 배열입니다 — 이는 헤드리스 엔벨로프가 읽는 것과 동일한 배열이므로 Coverage 카운트와 렌더링이 어긋날 수 없습니다.
- **Chains 라인 (선택 사항).** 하나 이상의 체인이 존재하는 경우, Coverage 블록에 마지막 라인을 추가합니다: `Chains: N root(s) with M dependents`. 여기서 N은 루트의 수이고 M은 모든 루트에 걸친 총 종속 항목 수입니다. 체인이 없으면 라인을 생략합니다. 이는 헤드리스 엔벨로프가 `references/synthesis-and-presentation.md`에서 출력하는 `Chains:` 라인을 미러링한 것으로, 검토자가 두 모드 모두에서 동일한 체인 가시성을 가질 수 있도록 합니다.
