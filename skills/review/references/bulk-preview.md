# 일괄 작업 미리보기 (Bulk Action Preview)

이 레퍼런스는 파일-티켓 라우팅 옵션(옵션 C)이 실행되기 전 Interactive 모드에서 보여주는 컴팩트한 플랜 미리보기를 정의합니다. 이 미리보기는 에이전트가 수행하려는 작업을 단일 화면으로 사용자에게 보여주며, 진행(Proceed) 또는 취소(Cancel)의 정확히 두 가지 옵션을 제공합니다.

Interactive 모드 전용입니다. 옵션 C에만 해당됩니다.

최선의 판단 경로(라우팅 옵션 B 및 워크스루의 `Auto-resolve with best judgment on the rest`)는 일괄 미리보기를 사용하지 **않습니다**. 최선의 판단 경로는 즉시 수정을 실행하고 실행 후 질문에서 실패를 표면화합니다(`SKILL.md` Step 2 Interactive 모드의 `(B)` 핸들러 참조). 티켓 생성은 되돌리기 비용이 큰 영구적인 외부 상태를 생성하므로 미리보기가 유익한 반면, 커밋되지 않은 편집에 로컬 수정을 적용하는 것은 그렇지 않습니다.

---

## 미리보기가 실행되는 시점

호출 지점은 하나입니다:

- **라우팅 옵션 C (최상위 티켓 생성 - File tickets)** — 사용자가 수정 사항을 적용하지 않고 발견 사항당 `File a [TRACKER] ticket per finding without applying fixes`를 선택한 후, 티켓이 생성되기 전입니다. 범위: 모든 보류 중인 `gated_auto` / `manual` 발견 사항. 에이전트의 권장 사항과 관계없이 옵션 C는 일괄 지연(batch-defer)이므로 모든 발견 사항이 `Filing [TRACKER] tickets (N):` 아래에 표시됩니다.

사용자는 `Proceed`로 확인하거나 `Cancel`로 중단합니다. 미리보기 내부에서 항목별 결정은 내리지 않으며, 항목별 결정은 워크스루(옵션 A)의 역할입니다.

---

## 미리보기 구조

미리보기는 에이전트가 취하려는 작업별로 그룹화됩니다. 버킷 헤더는 해당 버킷이 비어 있지 않을 때만 표시됩니다.

```
<Path label> — <scope summary>[ (tracker: <name>)]:

Applying (N):
  [P0] <file>:<line> — <one-line plain-English summary>
  [P1] <file>:<line> — <one-line plain-English summary>

Filing [TRACKER] tickets (N):
  [P2] <file>:<line> — <one-line plain-English summary>

Skipping (N):
  [P2] <file>:<line> — <one-line plain-English summary>

Acknowledging (N):
  [P3] <file>:<line> — <one-line plain-English summary>
```

라우팅 옵션 C (티켓 생성)의 예시:

```
File plan — 8 findings as Linear tickets:

Filing Linear tickets (8):
  [P0] orders_controller.rb:42 — Missing ownership guard on order lookup
  [P1] webhook_handler.rb:120 — Unhandled error swallowed in webhook
  [P2] user_serializer.rb:14 — internal_id leaks in serialized response
  [P2] billing_service.rb:230 — N+1 on refund batch
  [P2] session_helper.rb:12 — Session reset behavior unclear
  [P2] report_worker.rb:55 — Worker timeout under heavy load
  [P3] string_utils.rb:8 — Ambiguous helper name
  [P3] readme.md:14 — Documentation gap
```

---

## 범위 요약 문구 (Scope summary wording)

- **라우팅 옵션 C (최상위 티켓 생성):** 헤더는 `File plan — N findings as [TRACKER] tickets:`로 표시됩니다. 모든 발견 사항은 `Filing [TRACKER] tickets (N):` 버킷에 들어갑니다. 옵션 C는 일괄 지연이므로 Apply / Skip / Acknowledge 버킷은 미리보기에 렌더링되지 않습니다.

감지된 트래커의 신뢰도가 낮거나 일반적인 경우(`tracker-defer.md` 참조), 헤더에서 `(tracker: <name>)` 주석은 생략되며 `Filing [TRACKER] tickets` 버킷 헤더는 일반적인 형식(`Filing tickets (N):`)을 사용합니다.

---

## 발견 사항별 라인 형식

각 라인은 플랜의 프레이밍 품질 바의 압축된 형식을 사용합니다(R22-R25 — 관찰 가능한 동작 우선, 위치 확인에 필요한 경우가 아니면 함수/변수 이름 제외). 한 줄 요약은 페르소나가 생성한 `why_it_matters`에서 첫 번째 문장을 가져와 사용합니다(첫 문장이 미리보기 너비에 비해 너무 길 경우 내용을 간결하게 패러프레이징합니다).

- **형태:** `[<severity>] <file>:<line> — <one-line summary>`
- **너비 목표:** 좁은 터미널에서도 깔끔하게 렌더링되도록 80자 내외로 유지합니다. 필요한 경우 생략 부호(...)로 자릅니다.
- **인라인 함수/변수 이름 제외:** 독자가 이슈 위치를 찾는 데 필요한 경우가 아니면 제외합니다.
- **Advisory 버킷 문구:** `Acknowledging (N):` 버킷은 권고 내용을 한 줄로 설명합니다. 권고 발견 사항에는 구체적인 수정 사항이 없으므로 "fix" 문구를 사용하지 않습니다.

발견 사항에 대해 `why_it_matters`를 사용할 수 없는 경우(예: Unit 2의 템플릿 업그레이드가 페르소나 실행에 완전히 반영되지 않았거나 아티팩트 파일을 읽을 수 없는 경우), 발견 사항의 제목을 직접 사용합니다. 동일한 실행에서 여러 발견 사항에 영향을 미치는 경우 완료 보고서의 Coverage 섹션에 해당 공백을 기록하십시오.

---

## 질문 및 옵션

미리보기 본문이 렌더링된 후, 플랫폼의 차단 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user` (pi-ask-user 확장 필요))를 사용하여 사용자에게 질문합니다. Claude Code에서는 Interactive 모드 프리로드 단계에서 도구가 이미 로드되어 있어야 합니다. 로드되지 않은 경우 지금 `select:AskUserQuestion` 쿼리로 `ToolSearch`를 호출하십시오. 아래의 텍스트 폴백은 하네스에 차단 도구가 실제로 없는 경우(예: `ToolSearch` 결과 없음, 도구 호출 실패, 또는 `request_user_input`이 없는 Codex 편집 모드)에만 적용됩니다. 스키마 로드 대기는 폴백 트리거가 아닙니다. 질문을 무시하고 넘어가서는 안 됩니다.

질문 문구: `The agent is about to file the tickets above. Proceed?`

옵션 (정확히 두 가지):
- `Proceed` — 미리보기의 모든 티켓 생성
- `Cancel` — 아무 작업도 하지 않고 라우팅 질문으로 복귀

`ToolSearch`가 명시적으로 매치를 반환하지 않거나 도구 호출 오류가 발생하는 경우, 또는 차단 질문 도구가 없는 플랫폼에서만 번호가 매겨진 옵션을 제시하고 사용자의 다음 응답을 기다리는 방식으로 폴백합니다.

---

## 취소(Cancel) 의미론

`Cancel`은 사용자를 라우팅 질문(`SKILL.md` Step 2 Interactive 모드의 4가지 옵션 메뉴)으로 되돌립니다. 티켓은 생성되지 않으며 상태도 기록되지 않습니다. 세션의 캐시된 트래커 감지 튜플은 유지됩니다.

---

## 진행(Proceed) 의미론

사용자가 `Proceed`를 선택하면 미리보기의 모든 발견 사항이 티켓 생성을 위해 `references/tracker-defer.md`를 통해 라우팅됩니다. 수정 사항은 적용되지 않습니다. 모든 티켓이 생성된(또는 실패한) 후 통합 완료 보고서를 내보냅니다(`references/walkthrough.md` 참조).

`Proceed` 중 실패(예: 배치 지연 중 한 발견 사항에 대해 티켓 생성이 실패한 경우)는 `tracker-defer.md`에 정의된 실패 경로를 따릅니다. Retry / Fallback / Skip을 인라인으로 표시하고 나머지 플랜을 계속 진행하며, 완료 보고서의 실패 섹션에 실패를 기록합니다.

---

## 예외 케이스 (Edge cases)

- **N=1 미리보기 (범위 내에 발견 사항이 하나인 경우):** 미리보기는 여전히 한 줄 버킷으로 렌더링됩니다. `Proceed` / `Cancel`이 동일하게 적용됩니다.
- **트래커를 사용할 수 없음:** 업스트림에서 옵션 C가 제공되지 않습니다(`tracker-defer.md`의 sink 없음 처리 참조). 따라서 `any_sink_available`이 false인 경우 일괄 미리보기가 호출되지 않습니다.
