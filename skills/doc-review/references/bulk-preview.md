# Bulk Action Preview (일괄 작업 미리보기)

이 참조 문서는 모든 일괄 작업(Bulk Action) — 최선의 판단(best-judgment, 라우팅 옵션 B), 미결 질문에 추가(Append-to-Open-Questions, 라우팅 옵션 C), 그리고 워크스루의 `Auto-resolve with best judgment on the rest`(발견 사항별 질문의 옵션 D) — 전에 Interactive 모드에서 표시되는 압축된 계획 미리보기를 정의합니다. 이 미리보기는 에이전트가 수행하려는 작업을 사용자에게 단일 화면으로 보여주며, `Proceed`(진행) 또는 `Cancel`(취소)의 두 가지 옵션만 제공합니다.

Interactive 모드 전용입니다.

---

## 미리보기가 실행되는 시점 (When the preview fires)

세 가지 호출 지점이 있습니다:

1. **라우팅 옵션 B (최상위 최선의 판단)** — 사용자가 라우팅 질문에서 `Auto-resolve with best judgment — apply per-finding edits the agent can defend, surface the rest`를 선택한 후, 작업이 실행되기 전입니다. 범위: 신뢰도 앵커(confidence anchor) `75` 또는 `100`인 모든 보류 중인 `gated_auto` 또는 `manual` 발견 사항입니다.
2. **라우팅 옵션 C (최상위 미결 질문에 추가)** — 사용자가 `Append findings to the doc's Open Questions section and proceed`를 선택한 후, 추가 작업이 실행되기 전입니다. 범위: 신뢰도 앵커 `75` 또는 `100`인 모든 보류 중인 `gated_auto` 또는 `manual` 발견 사항입니다. 옵션 C는 일괄 지연(batch-defer)이므로, 에이전트의 원래 권장 사항에 관계없이 모든 발견 사항은 `Appending to Open Questions (N):` 아래에 표시됩니다.
3. **워크스루의 `Auto-resolve with best judgment on the rest`** — 사용자가 발견 사항별 질문에서 `Auto-resolve with best judgment on the rest`를 선택한 후, 나머지 발견 사항들이 해결되기 전입니다. 범위: 현재 발견 사항과 아직 결정되지 않은 모든 사항입니다. 워크스루에서 이미 결정된 발견 사항은 미리보기에 포함되지 않습니다.

세 가지 경우 모두 사용자는 `Proceed`로 확인하거나 `Cancel`로 취소합니다. 미리보기 내에서는 항목별 결정을 내리지 않습니다 — 항목별 결정은 워크스루의 역할입니다.

---

## 미리보기 구조 (Preview structure)

미리보기는 에이전트가 의도하는 작업별로 그룹화됩니다. 버킷 헤더는 해당 버킷이 비어 있지 않을 때만 표시됩니다.

```
<Path label> — <scope summary>:

Applying (N):
  [P0] <section> — <one-line plain-English summary>
  [P1] <section> — <one-line plain-English summary>

Appending to Open Questions (N):
  [P2] <section> — <one-line plain-English summary>

Skipping (N):
  [P2] <section> — <one-line plain-English summary>
```

라우팅 옵션 B(최상위 최선의 판단)에 대한 적용 사례:

```
Auto-resolve plan — 8 findings:

Applying (4):
  [P0] Requirements Trace — Renumber R4 to match unit reference
  [P1] Unit 3 Files — Add read-fallback for renamed report file
  [P2] Key Technical Decisions — Use framework's Deprecated field rather than hand-rolling
  [P3] Overview — Correct wrong count (says 6, list has 5)

Appending to Open Questions (2):
  [P2] Scope Boundaries — Unit 2/3 merge judgment call
  [P2] Risks — Alias compatibility-theater concern

Skipping (2):
  [P2] Miscellaneous Notes — Low-confidence style preference
  [P3] Abstraction Commentary — Speculative, subjective
```

---

## 경로별 범위 요약 문구 (Scope summary wording by path)

- **라우팅 옵션 B (최상위 최선의 판단):** 헤더는 `Auto-resolve plan — N findings:`로 표시됩니다.
- **라우팅 옵션 C (최상위 미결 질문에 추가):** 헤더는 `Append plan — N findings as Open Questions entries:`로 표시됩니다. 모든 발견 사항은 `Appending to Open Questions (N):` 버킷에 들어갑니다.
- **워크스루의 `Auto-resolve with best judgment on the rest`:** 헤더는 `Auto-resolve plan — N remaining findings (K already decided):`로 표시됩니다. 워크스루에서 이미 결정된 발견 사항은 미리보기나 버킷 카운트에 포함되지 않습니다. `K already decided` 카운터는 워크스루가 부분적으로 완료되었음을 나타냅니다.

---

## 발견 사항별 라인 형식 (Per-finding line format)

각 라인은 subagent 템플릿의 프레이밍 품질 가이드(관찰 가능한 결과 우선, 위치 파악에 필요한 경우를 제외하고 내부 섹션 번호 생략)의 압축된 형식을 사용합니다. 한 줄 요약은 페르소나가 생성한 `why_it_matters`의 첫 번째 문장에서 가져옵니다(첫 번째 문장이 미리보기 너비에 비해 너무 길면 적절하게 의역합니다).

- **형식:** `[<severity>] <section> — <one-line summary>`
- **너비 목표:** 좁은 터미널에서도 미리보기가 깔끔하게 렌더링되도록 라인을 80자 근처로 유지합니다. 필요한 경우 말줄임표로 자릅니다.
- **섹션 번호 생략:** 독자가 해당 이슈를 찾는 데 필요한 경우(동일한 이름의 섹션에 여러 발견 사항이 있는 경우)를 제외하고 섹션 번호를 생략합니다.

발견 사항에 대해 `why_it_matters`를 사용할 수 없는 경우(페르소나 출력이 잘못된 경우 등 드문 경우), 발견 사항의 제목을 직접 사용합니다. 동일한 실행에서 여러 발견 사항에 영향을 미치는 경우 완료 보고서의 Coverage 섹션에 해당 공백을 기록하십시오.

---

## 질문 및 옵션 (Question and options)

미리보기 본문이 렌더링된 후, 플랫폼의 블로킹 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 사용자에게 묻습니다. Claude Code에서는 Interactive 모드 프리로드 단계에서 도구가 이미 로드되어 있어야 합니다 — 로드되지 않은 경우, 지금 `ToolSearch`를 호출하여 `select:AskUserQuestion` 쿼리를 수행하십시오. 아래의 텍스트 폴백(fallback)은 하네스에 블로킹 도구가 실제로 없는 경우 — `ToolSearch` 결과가 없고, 도구 호출이 명시적으로 실패하거나, 런타임 모드에서 도구가 노출되지 않는 경우(예: `request_user_input`이 없는 Codex 편집 모드)에만 적용됩니다. 스키마 로드 대기 중인 상태는 폴백 트리거가 아닙니다. 절대로 질문을 자동으로 건너뛰지 마십시오.

질문 내용 (경로에 따라 조정됨):

- 라우팅 B의 경우: `The agent is about to apply the plan above. Proceed?`
- 라우팅 C의 경우: `The agent is about to append the findings above to the doc's Open Questions section. Proceed?`
- 워크스루의 `Auto-resolve with best judgment on the rest`의 경우: `The agent is about to resolve the remaining findings above. Proceed?`

옵션 (세 가지 경우 모두 정확히 두 개):

- `Proceed` — 표시된 대로 계획 실행
- `Cancel` — 아무 작업도 하지 않고 원래 질문으로 복귀

`ToolSearch`가 명시적으로 검색 결과 없음을 반환하거나 도구 호출이 에러를 발생시키는 경우 — 또는 블로킹 질문 도구가 없는 플랫폼에서만 — 번호가 매겨진 옵션을 제시하고 사용자의 다음 응답을 기다리는 방식으로 폴백합니다.

---

## 취소 시 동작 (Cancel semantics)

- **라우팅 옵션 B 취소 시:** 사용자를 라우팅 질문(4개 옵션 메뉴)으로 되돌립니다. 문서를 편집하지 않고, Open Questions 항목을 추가하지 않으며, 어떤 상태도 기록하지 않습니다.
- **라우팅 옵션 C 취소 시:** 동일합니다 — 라우팅 질문으로 되돌리며 부수 효과가 없습니다.
- **워크스루의 `Auto-resolve with best judgment on the rest` 취소 시:** 사용자를 라우팅 질문이 아닌 현재 발견 사항의 질문으로 되돌립니다. 워크스루는 이전 결정이 유지된 상태로 중단된 지점부터 계속됩니다.

모든 경우에 `Cancel`은 디스크나 메모리 상태를 변경하지 않습니다.

---

## 계속 진행 시 동작 (Proceed semantics)

사용자가 `Proceed`를 선택한 경우:

- **라우팅 옵션 B (최상위 최선의 판단):** 계획의 각 발견 사항에 대해 권장 작업을 실행합니다. Apply 발견 사항은 단일 일괄 문서 편집 단계(Apply 배치 규칙은 `walkthrough.md` 참조)를 위해 Apply 세트에 들어갑니다. Defer 발견 사항은 `references/open-questions-defer.md`를 통해 라우팅됩니다. Skip 발견 사항은 작업 없음(no-action)으로 기록됩니다. 모든 작업이 완료된 후 통합 완료 보고서(`walkthrough.md` 참조)를 내보냅니다.
- **라우팅 옵션 C (최상위 미결 질문에 추가):** 모든 발견 사항은 Open Questions 추가를 위해 `references/open-questions-defer.md`를 통해 라우팅됩니다. (Open Questions 섹션 추가 자체를 제외하고) 문서 편집은 적용되지 않습니다. 모든 추가 작업이 완료(또는 실패)된 후 통합 완료 보고서를 내보냅니다.
- **워크스루의 `Auto-resolve with best judgment on the rest`:** 라우팅 옵션 B와 동일하지만, 사용자가 아직 결정하지 않은 발견 사항으로 범위가 제한됩니다. Apply 발견 사항은 사용자가 워크스루 중에 이미 선택한 것들과 함께 메모리 내 Apply 세트에 합쳐지며, 워크스루 종료 시 단일 Apply 단계에서 모두 함께 처리됩니다.

`Proceed` 중 실패(예: 일괄 Defer 중에 한 발견 사항에 대한 Open Questions 추가 실패)가 발생하면 `references/open-questions-defer.md`에 정의된 실패 경로를 따릅니다 — Retry / Fall back / Convert to Skip과 함께 실패를 인라인으로 표시하고, 나머지 계획을 계속 진행하며, 완료 보고서의 실패 섹션에 실패 내용을 캡처합니다.

---

## 예외 사례 (Edge cases)

- **버킷에 발견 사항이 없는 경우:** 버킷 헤더를 생략합니다. Apply와 Skip만 있는 미리보기는 빈 `Appending to Open Questions (0):` 라인을 표시하지 않습니다.
- **모든 발견 사항이 하나의 버킷에 있는 경우:** 미리보기는 여전히 버킷 헤더를 표시하며, `Proceed` / `Cancel` 옵션을 여전히 제공합니다. 이는 라우팅 옵션 C(모든 발견 사항이 `Appending to Open Questions` 아래에 있음)의 일반적인 경우입니다.
- **N=1 미리보기 (범위 내에 발견 사항이 하나인 경우):** 미리보기는 여전히 그룹화된 형식을 사용하며 단일 라인 버킷으로 표시됩니다. `Proceed` / `Cancel`이 여전히 적용됩니다.
- **미결 질문 추가를 사용할 수 없는 경우** (문서가 읽기 전용이거나 추가 흐름이 실행 불가로 보고됨): 라우팅 옵션 C는 상위 단계에서 제공되지 않습니다 (`references/open-questions-defer.md` 실행 불가 처리 참조). 최선의 판단(옵션 B) 및 워크스루의 `Auto-resolve with best judgment on the rest`는 여전히 실행될 수 있습니다 — 여기에는 합성(synthesis) 과정에서의 항목별 Defer 권장 사항이 포함될 수 있습니다. 최선의 판단 형태의 미리보기를 렌더링하기 전에, 세션의 캐시된 추가 가능 여부가 false인 경우 모든 Defer 권장 사항을 Skip으로 다운그레이드하고 미리보기에 다운그레이드 내용을 표시합니다 (예: `Skipping — append unavailable (N):` 버킷 표시 또는 헤더에 `N Defer recommendations downgraded to Skip — document is read-only.`와 같은 노트 추가).
- **남은 발견 사항이 0개인 상태에서 `Auto-resolve with best judgment on the rest` 실행:** 워크스루 자체 로직에서 N=1인 경우 등에 `Auto-resolve with best judgment on the rest`를 옵션에서 억제하므로, 남은 발견 사항이 0개인 상태로 미리보기가 호출되어서는 안 됩니다. 만약 호출된다면 `Auto-resolve plan — 0 remaining findings`를 렌더링하고 아무 작업 없이 Proceed로 넘어갑니다.
