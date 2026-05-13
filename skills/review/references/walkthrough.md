# 발견 사항별 워크스루 (Per-finding Walk-through)

이 레퍼런스는 Interactive 모드의 발견 사항별 워크스루를 정의합니다. 이는 사용자가 라우팅 질문에서 옵션 A(`Review each finding one by one — accept the recommendation or choose another action`)를 선택했을 때 진입하는 경로입니다. 또한 모든 터미널 경로(워크스루, 최선의 판단, 티켓 생성, 발견 사항 0개)에서 내보내는 통합 완료 보고서도 다룹니다.

Interactive 모드 전용입니다.

---

## 진입 (Entry)

워크스루는 오케스트레이터로부터 다음을 수신합니다:

- 심각도 순서(P0 → P1 → P2 → P3)로 정렬되고, Stage 5 앵커 게이트(앵커 75 이상, P0는 앵커 50에서 통과)를 통과한 `gated_auto` 및 `manual` 발견 사항이 포함된 병합된 발견 사항 목록. 권고(Advisory) 발견 사항은 이 단계로 표면화된 경우 포함됩니다(권고 발견 사항은 일반적으로 보고 전용 큐에 머물지만, 리뷰 흐름이 확인을 위해 여기로 라우팅한 경우 아래의 권고 변형을 따릅니다).
- `tracker-defer.md`에서 제공하는 캐시된 트래커 감지 튜플 (`{ tracker_name, confidence, named_sink_available, any_sink_available }`). `any_sink_available`은 Defer 옵션 제공 여부를 결정하고, `named_sink_available` + `confidence`는 레이블에 트래커 이름을 인라인으로 표시할지 결정합니다.
- 아티팩트 조회를 위한 실행 ID(run id).

각 발견 사항의 권장 조치는 이미 Stage 5(7b 단계 — 조치에 대한 타이브레이크)에서 정규화되었습니다. 워크스루는 해당 권장 사항을 사용자에게 표시하지만 다시 계산하지는 않습니다.

---

## 발견 사항별 프레젠테이션

각 발견 사항은 두 부분으로 제시됩니다: 설명을 담은 **터미널 출력 블록**과 결정을 내리기 위한 플랫폼의 **차단 질문 도구**(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user` (pi-ask-user 확장 필요))를 통한 **질문**입니다. 두 부분을 절대 합치지 마십시오 — 터미널 블록은 마크다운을 사용하고, 질문은 일반 텍스트를 사용합니다.

Claude Code에서는 `SKILL.md`의 Interactive 모드 프리로드 단계에서 도구가 이미 로드되어 있어야 합니다. 로드되지 않은 경우 지금 `select:AskUserQuestion` 쿼리로 `ToolSearch`를 호출하십시오. 하네스에 차단 도구가 실제로 없는 경우에만 발견 사항별 옵션을 번호가 매겨진 목록으로 제시하고 사용자의 다음 응답을 기다리는 방식으로 폴백하십시오. 스키마 로드 대기는 폴백 트리거가 아닙니다. 질문을 무시하고 넘어가서는 안 됩니다.

### 터미널 출력 블록 (질문을 던지기 전 출력)

마크다운으로 렌더링합니다. 레이블은 별도의 라인에 작성하고 섹션 사이에는 빈 라인을 둡니다:

```
## Finding {N} of {M} — {severity} {plain-English title}

{file}:{line}

**What's wrong**

{plain-English problem statement from why_it_matters}

**Proposed fix**

{suggested_fix — 아래의 치환 규칙에 따라 렌더링: 산문 우선, 의도 중심어 사용}

**Why it works**

{코드베이스 패턴에 근거한 짧은 추론}

{R15 conflict context line, 해당하는 경우}
```

치환 규칙:

- **`{plain-English title}`:** 제목으로 적합한 3-8단어 요약. 병합된 발견 사항의 `title` 필드에서 파생되지만 관찰 가능한 동작으로 읽히도록 재구성합니다(예: "userId validation 누락" 대신 "loadUserFromCache에서의 경로 트래버스(Path traversal)").
- **`why_it_matters`:** `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`에 있는 해당 리뷰어의 아티팩트 파일을 읽어옵니다. 이때 headless 모드에서 사용하는 것과 동일한 `file + line_bucket(line, +/-3) + normalize(title)` 매칭 방식을 사용합니다(SKILL.md Stage 6 상세 강화 내용 참조). 여러 리뷰어가 병합된 발견 사항을 지적한 경우, 병합된 발견 사항의 리뷰어 목록에 나타나는 순서대로 시도하여 첫 번째 매치를 사용합니다.
- **`suggested_fix`:** 병합된 발견 사항의 `suggested_fix` 필드에서 가져옵니다. 문법이 아닌 **의도**를 설명하는 산문으로 렌더링합니다. 수정자 서브 에이전트가 정확한 코드를 소유하므로, 워크스루는 사용자가 작업을 신뢰하거나 거부할 수 있을 정도의 정보만 제공하면 됩니다. 규칙:
  - **기본값 — 효과를 설명하는 한 문장.** 수정이 무엇을 달성하며 어디에 적용되는가? 인용된 코드보다 의도 중심의 언어를 선호하십시오.
    - ✅ `JSON 파싱 전 non-2xx 응답에 대해 에러를 던집니다.`
    - ✅ `` 42번 라인의 `==`를 `===`로 바꿉니다. ``
    - ✅ `` fetch 후 `response.ok` 체크를 추가하고 non-2xx인 경우 에러를 던집니다. ``
    - ✅ `요청 생성 로직을 헬퍼로 추출하고 두 곳 모두에서 호출하도록 합니다.`
    - ❌ `` `await fetch(...)` 호출 후 `response.json()` 이전에 `if (!response.ok) throw new Error(`HTTP ${response.status}`);`를 추가합니다. `` — 중첩된 백틱, 여러 코드 스팬, 전체 문장 인용; 터미널에서 깨져 보입니다.
  - **코드 스팬 예산: 문장당 최대 2개의 인라인 백틱 스팬, 각각은 단일 식별자, 연산자 또는 짧은 문구** (예: `` `response.ok` ``, `` `===` ``, `` `fetchUserById` ``). 전체 문장, 템플릿 리터럴 또는 중첩된 백틱이 필요한 코드를 포함하지 마십시오. 의도를 이 예산 내에서 설명할 수 없다면 산문이 구문에 너무 가깝다는 의미입니다 — 더 높은 수준에서 다시 설명하거나 요약 + 아티팩트 포인터 방식으로 전환하십시오.
  - **모든 백틱 스팬 앞뒤에 항상 공백을 두십시오.** 공백이 없으면 터미널의 마크다운 렌더러가 구분 기호를 먹어버리고 단어들이 붙어서 표시됩니다.
  - **Raw 코드 블록 — 이전 상태가 없는 짧은(5라인 이하) 순수 추가 코드**의 경우에만 사용하십시오(새 파일, 새 함수, 빈 본문 상단의 새 가드). 5라인을 초과하면 요약 + 포인터 방식으로 전환하십시오.
  - **요약 + 아티팩트 포인터** — 산문으로 수정을 포착할 수 없는 경우: 한 문장의 변환 설명 + 주요 심볼/위치 + `Full fix: /tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json → findings[].suggested_fix`.
  - **diff 블록 금지.** 기존 코드에 대한 수정은 산문으로 렌더링합니다.
- **`Why it works`:** 가능한 경우 코드베이스의 다른 곳에서 이미 사용 중인 유사한 패턴을 참조하는 근거 있는 추론 (예: "src/cli/io.ts:41에서 이미 사용 중인 형식 검증 패턴과 일치함"). 한 문장에서 세 문장 정도.
- **R15 conflict context line (해당하는 경우):** 참여 리뷰어들이 이 발견 사항에 대해 서로 다른 조치를 제안했고 Stage 5의 7b 단계에서 타이브레이크가 발생한 경우, 이를 짧게 표시합니다. 예: `Correctness recommends Apply; Testing recommends Skip (low confidence). Agent's recommendation: Skip.` 타이브레이크 이후의 값이 메뉴에서 "recommended"로 표시되는 오케스트레이터의 권장 사항입니다.

발견 사항에 대해 아티팩트 매치가 존재하지 않는 경우(병합 시 합성된 발견 사항이거나 페르소나의 아티팩트 기록 실패), 터미널 블록은 제목 + `suggested_fix`로만 축소되며(`What's wrong` 및 `Why it works` 섹션 생략), 완료 보고서의 Coverage 섹션에 해당 공백을 기록합니다.

### 질문 줄기 (Question stem - 짧고 결정 중심적인 문구)

터미널 블록이 렌더링된 후, 압축된 두 줄의 질문 줄기와 함께 플랫폼의 차단 질문 도구를 호출합니다:

```
Finding {N} of {M} — {severity} {short handle}.
{Action framing in a phrase}?
```

여기서:

- **Short handle:** 터미널 블록 헤더의 `{plain-English title}`과 일치합니다.
- **Action framing:** 단일 권장 조치가 수행하는 작업을 설명하는 한 문구의 예/아니오 질문. 예: `Apply the format-validation + path.resolve guard?`, `Skip the fix since the fixture is being deleted?`, `Defer and file a rotation ticket?`.

질문 줄기에 대안을 열거하지 마십시오. 하나의 권장 사항을 예/아니오 질문으로 던지고, 옵션 목록에 대안을 포함합니다. 권장 사항이 아슬아슬하게 결정된 경우, 다중 옵션 질문 줄기가 아닌 R15 conflict context line에 의견 불일치를 표시하십시오.

예시 (권장 조치 = Apply):

```
Finding 3 of 8 — P1 path traversal in loadUserFromCache.
Apply the format-validation + path.resolve guard?
```

예시 (내용 컨텍스트가 기본값을 덮어써서 권장 조치 = Skip인 경우):

```
Finding 1 of 9 — P0 hardcoded admin token.
Skip the fix since the fixture is being deleted?
(Security recommends Apply; file context recommends Skip. Agent's recommendation: Skip.)
```

질문 줄기에 코드 블록, diff 구문 또는 전체 수정/추론 내용을 포함하지 마십시오.

### 발견 사항 사이의 확인 메시지

사용자가 응답한 후 다음 발견 사항의 터미널 블록을 출력하기 전, 취해진 조치에 대한 한 줄의 확인 메시지를 내보냅니다. 예: `→ Applied. Fix staged at src/utils/api-client.ts:36-37.`, `→ Deferred. Ticket filed: <url>.`, `→ Skipped.`, `→ Acknowledged.`

### 옵션 (4개, 또는 상황에 따라 조정됨)

순서 고정. 절대 순서를 바꾸지 마십시오:

```
1. Apply the proposed fix
2. Defer — file a [TRACKER] ticket
3. Skip — don't apply, don't track
4. Auto-resolve with best judgment on the rest
```

`tracker-defer.md`에 따라 `[TRACKER]` 레이블을 렌더링합니다: `confidence = high` 이고 `named_sink_available = true`인 경우 `[TRACKER]`를 구체적인 트래커 이름(예: `Defer — file a Linear ticket`)으로 바꿉니다. `any_sink_available = true`이지만 `confidence = low` 또는 `named_sink_available = false`인 경우 일반적인 레이블인 `Defer — file a ticket`을 사용합니다 — `[TRACKER]` 토큰 교체가 아닌 전체 레이블 치환입니다.

**타이브레이크 이후의 권장 사항을 옵션 레이블에 `(recommended)`로 표시하십시오.** 이는 선택 사항이 아닌 필수 사항입니다. 4개의 옵션 중 어느 것이든 권장 사항이 될 수 있습니다:

```
1. Apply the proposed fix  (recommended)
2. Defer — file a ticket
3. Skip — don't apply, don't track
4. Auto-resolve with best judgment on the rest
```

```
1. Apply the proposed fix
2. Defer — file a ticket
3. Skip — don't apply, don't track  (recommended)
4. Auto-resolve with best judgment on the rest
```

리뷰어들이 동의하지 않았거나 내용 컨텍스트가 기본값과 상충하는 경우에도, Stage 5의 7b 단계가 생성한 옵션에 표시하고 R15 conflict context line에 불일치를 표면화하십시오.

### 적응형 조정 (Adaptations)

- **`suggested_fix` 없음 (Apply 억제):** 발견 사항에 구체적인 `suggested_fix`가 없는 경우(`gated_auto` 또는 `manual`이면서 `suggested_fix == null`), 메뉴에서 옵션 A(`Apply`)가 **생략됩니다**. Stage 5의 6b 단계에서 이들을 이미 `Defer` 권장으로 매핑했으므로, `(recommended)` 마커는 여전히 표시되는 다른 옵션에 붙게 됩니다. 메뉴에는 세 가지 옵션이 표시됩니다: `Defer` / `Skip` / `Auto-resolve with best judgment on the rest` (sink 없음 조정과 결합될 경우 `Skip` / `Auto-resolve with best judgment on the rest`로 축소). 이 규칙은 `SKILL.md` Step 2 Interactive 옵션 B의 실행 후 `Walk through these one at a time` 재진입 시 적용되는 억제와 일치하므로, 어떤 진입 경로를 통하든 동일하게 처리됩니다.
- **권고 전용(Advisory-only) 발견 사항:** 발견 사항의 `autofix_class`가 `advisory`인 경우(수정 사항 없음), 옵션 A는 `Acknowledge — mark as reviewed`로 교체됩니다. 나머지 세 옵션은 유지됩니다. 권고 변형은 메뉴에 `Acknowledge`가 나타나는 유일한 케이스입니다.
- **N=1 (보류 중인 발견 사항이 정확히 하나인 경우):** 터미널 블록 헤더에서 `Finding N of M`을 생략하고 `## {severity} {plain-English title}`로 렌더링합니다. 질문 줄기의 첫 번째 라인에서 위치 카운터를 제거하여 `{severity} {short handle}.`로 표시합니다. 이후의 발견 사항이 없으므로 옵션 D(`Auto-resolve with best judgment on the rest`)는 억제됩니다 — 메뉴에는 세 가지 옵션이 표시됩니다: Apply / Defer / Skip (권고인 경우 Acknowledge).
- **Sink 없음 (Defer 옵션 사용 불가):** 트래커 감지 튜플이 `any_sink_available: false`를 보고하면(폴백 체인의 모든 티어 — 지정된 트래커 및 `gh`를 통한 GitHub Issues — 에 도달할 수 없음), 옵션 B(`Defer`)는 생략됩니다. 질문 줄기 뒤에 이 체크아웃에 대해 구성된 이슈 트래커(Linear, GitHub Issues 등)가 없음을 설명하는 한 줄을 추가합니다. 개발자 청중을 대상으로 문구를 작성하십시오 — `tracker sink`와 같은 전문 용어나 에이전트 플랫폼별 이슈가 아닌 프로젝트별 이슈임을 나타내기 위해 `platform`이라는 단어를 피하십시오. 메뉴에는 세 가지 옵션이 표시됩니다: Apply / Skip / Auto-resolve with best judgment on the rest (권고 전용인 경우 Apply 대신 Acknowledge). **옵션을 렌더링하기 전, Stage 5의 7b 단계가 생성한 모든 발견 사항별 `Defer` 권장 사항을 `Skip`으로 재매핑하십시오.** 그래야 `(recommended)` 마커가 항상 실제 메뉴에 있는 옵션에 붙게 됩니다. 재매핑이 발생하면 R15 conflict context line에 표시하십시오 — 무엇이 강등되었고 왜 그런지 이름을 명시하여 독자가 교차 리뷰어의 Defer 권장 사항이 조용히 사라지지 않았음을 알 수 있게 하십시오. 이는 렌더링 시점의 런타임 단계입니다; Stage 5의 7b 단계는 sink 가용성을 알지 못하며 충돌하는 리뷰어 권장 사항만 정렬합니다.
- **N=1 + Sink 없음 결합:** 메뉴에는 두 가지 옵션이 표시됩니다: Apply / Skip (또는 Acknowledge / Skip).

`ToolSearch`가 명시적으로 매치를 반환하지 않거나 도구 호출 오류가 발생하는 경우에만 옵션을 번호가 매겨진 목록으로 제시하고 사용자의 다음 응답을 기다리는 방식으로 폴백합니다.

---

## 발견 사항별 라우팅

각 발견 사항에 대한 답변 처리:

- **Apply the proposed fix** — 발견 사항의 ID를 메모리 내 Apply 세트에 추가합니다. 다음 발견 사항으로 넘어갑니다. 수정자를 인라인으로 실행하지 마십시오 — Apply는 워크스루 종료 시 일괄 실행을 위해 누적됩니다.
- **Acknowledge — mark as reviewed** (권고 변형) — 메모리 내 결정 목록에 Acknowledge를 기록합니다. 다음 발견 사항으로 넘어갑니다. 부수 효과는 없습니다.
- **Defer — file a [TRACKER] ticket** — `tracker-defer.md`의 트래커 지연 흐름을 호출합니다. 실패 경로 하위 질문(Retry / Fall back / Convert to Skip) 동안 워크스루의 위치 지시계는 현재 발견 사항에 머밉니다. 성공 시, 메모리 내 결정 목록에 트래커 URL / 참조를 기록하고 다음으로 넘어갑니다. 실패 경로에서 Convert-to-Skip을 선택한 경우, 실패 내용을 완료 보고서에 남기고 다음으로 넘어갑니다.
- **Skip — don't apply, don't track** — 메모리 내 결정 목록에 Skip을 기록합니다. 다음으로 넘어갑니다. 부수 효과는 없습니다.
- **Auto-resolve with best judgment on the rest** — 워크스루 루프를 종료하고 남은 작업 세트(현재 발견 사항 + 아직 결정되지 않은 모든 사항)에 대해 즉시 수정자 서브 에이전트(`SKILL.md` Step 3)를 실행합니다. Stage 5b 사전 패스도 없고 일괄 미리보기 승인 게이트도 없습니다. 수정자는 구체적인 `suggested_fix`가 있는 항목을 적용하고, 권고 항목은 아무 작업도 하지 않으며, 수정을 깨끗하게 적용할 수 없거나(또는 증거가 더 이상 코드와 일치하지 않는) 항목은 한 줄의 사유와 함께 `failed` 버킷으로 라우팅합니다. 사용자가 워크스루 중에 이미 선택한 Apply 발견 사항들도 동일한 수정자 패스에서 함께 처리됩니다 — 남은 세트가 메모리 내 Apply 세트와 합쳐져 수정자가 일관된 트리(tree)에 대해 모든 변경 사항을 한꺼번에 수신하고 적용할 수 있게 합니다. 수정자가 결과를 반환한 후, `SKILL.md` Step 2 Interactive 옵션 B의 실행 후 실패 처리 로직을 따릅니다 — `failed` 버킷이 비어 있지 않으면 세 가지 옵션(file tickets / walk through / ignore)이 있는 질문을 하나 던집니다. `failed` 버킷이 비어 있으면 통합 완료 보고서를 즉시 내보냅니다.

---

## 재정의 규칙 (Override rule)

"재정의(Override)"는 사용자가 다른 사전 설정된 조치를 선택하는 것을 의미합니다(Apply 대신 Defer나 Skip을 선택하거나, 에이전트 권장 사항 대신 Apply를 선택함). 인라인으로 자유 형식의 커스텀 수정을 작성하는 기능은 없습니다 — 워크스루는 결정 루프이지 페어 프로그래밍 표면이 아닙니다. 제안된 수정의 변형을 원하는 사용자는 Skip을 선택하고 흐름 외부에서 직접 수정합니다. 해당 발견 사항이 트래킹되기를 원하는 경우 티켓을 수동으로 생성합니다. 이 트레이드오프는 v1의 범위 경계 내에서 명시적입니다.

---

## 상태 (State)

워크스루 상태는 **메모리 내에만** 유지됩니다. 오케스트레이터는 다음을 관리합니다:

- Apply 세트 (사용자가 Apply를 선택한 발견 사항 ID들)
- 결정 목록 (답변된 모든 발견 사항과 해당 조치 및 Deferred의 경우 `tracker_url`, Skipped의 경우 `reason`과 같은 메타데이터)
- 발견 사항 목록 내의 현재 위치

결정마다 디스크에 기록되는 것은 없습니다. 중단된 워크스루(사용자의 프롬프트 취소, 세션 압축, 네트워크 단절 등)는 모든 메모리 내 상태를 폐기합니다. 이미 실행된 Defer 작업은 트래커에 남게 됩니다 — 이는 외부 부수 효과이며 되돌릴 수 없습니다. Apply 결정은 아직 실행되지 않았으므로(워크스루 종료 시 일괄 처리됨), 코드 변경 없이 깔끔하게 소실됩니다.

공식적인 크로스 세션 재개 기능은 v1 범위 밖입니다.

---

## 워크스루 종료 시 실행 (End-of-walk-through dispatch)

이 섹션은 실행 완수 경로(모든 발견 사항에 대해 Apply / Defer / Skip / Acknowledge로 답변되어 루프가 자연스럽게 종료됨)만을 다룹니다. `Auto-resolve with best judgment on the rest` 경로는 워크스루를 일찍 종료하고 (누적된 Apply 세트 ∪ 남은 미결정 발견 사항)의 합집합에 대해 자체적으로 수정자 패스를 실행합니다. 위의 "발견 사항별 라우팅" 섹션의 해당 항목을 참조하십시오. 해당 분기에서는 두 번째 실행 단계가 없습니다.

루프가 완수되면 워크스루는 실행 단계로 넘겨줍니다:

1. **Apply 세트:** 누적된 전체 Apply 세트에 대해 하나의 수정자 서브 에이전트를 실행합니다. 수정자는 세트를 입력 큐로 수신하고 현재 작업 트리에 대해 모든 변경 사항을 한 번의 패스로 적용합니다. 이는 기존의 "하나의 수정자, 일관된 트리" 메커니즘을 유지하며, 수정자가 전체 세트를 한꺼번에 수신하여 겹치는 영역을 건드리는 두 Apply 간의 의존성을 처리할 수 있게 합니다. 기존의 Step 3 수정자 프롬프트는 이 큐가 이질적일 수 있음(`safe_auto`, `gated_auto`, `manual`의 혼합)을 인지하도록 약간의 업데이트가 필요하며, 이 레퍼런스와 함께 작성되었습니다.
2. **Defer 세트:** 워크스루 도중 이미 인라인으로 실행되었습니다. 여기서는 실행할 것이 없습니다.
3. **Skip / Acknowledge:** 아무 작업도 하지 않습니다.

실행이 완료되면 아래 설명된 통합 완료 보고서를 내보냅니다.

---

## 통합 완료 보고서

Interactive 모드의 모든 터미널 경로는 동일한 완료 보고서 구조를 내보냅니다. 다음 사례들이 포함됩니다:

- 워크스루 완수 (모든 발견 사항에 답변함)
- `Auto-resolve with best judgment on the rest`를 통한 워크스루 중단
- 최상위 최선의 판단 (라우팅 옵션 B) 완수
- 최상위 티켓 생성 (라우팅 옵션 C) 완수
- `safe_auto` 후 발견 사항 0개 (라우팅 질문을 건너뜀 — 완료 요약은 이 구조의 한 줄짜리 특수 케이스입니다)

### 최소 필수 필드 (R12에 따름)

- **발견 사항별 항목:** 흐름이 건드린 모든 발견 사항에 대해 최소한 제목, 심각도, 취해진 조치(Applied / Deferred / Skipped / Acknowledged)를 포함한 라인을 작성합니다. Deferred 항목의 경우 트래커 URL이나 세션 내 작업 참조를, Skipped 항목의 경우 발견 사항의 신뢰도나 한 줄짜리 `why_it_matters` 스니펫에 근거한 한 줄 사유를 포함합니다.
- **조치별 요약 카운트:** 버킷별 합계 (예: `4 applied, 2 deferred, 2 skipped`).
- **명시적으로 표시되는 실패:** 실패한 수정 적용이나 티켓 생성 실패(트래커가 반환한 사유 포함). 실패는 발견 사항별 목록 위에 표시되어 사용자가 놓치지 않게 합니다.
- **리뷰 종료 판정:** 모든 조치가 완료된 후 잔존 상태로부터 계산된 기존 Stage 6 판정 (Ready to merge / Ready with fixes / Not ready).

### Coverage 섹션

기존 Coverage 데이터(억제된 발견 사항 개수, 잔존 리스크, 테스트 갭, 실패한 리뷰어)를 그대로 가져오고 한 가지 새로운 요소를 추가합니다:

- **프레이밍 강화 공백 (Framing-enrichment gaps):** 아티팩트 조회가 매치를 반환하지 않은 발견 사항의 개수(병합 시 합성된 발견 사항 또는 페르소나 아티팩트 기록 실패). 이러한 공백을 유발한 페르소나의 이름을 명시하여 향후 페르소나 업그레이드 결정에 데이터를 제공합니다. 실행당 공백 추적은 팀에 어떤 페르소나 에이전트가 여전히 개선이 필요한지 알려줍니다.

### 보고서 순서

보고서는 모든 실행이 완료된 후 나타납니다. 보고서 내부 순서: 실패 내용 우선 (발견 사항별 목록 위), 그 다음 `Applied / Deferred / Skipped / Acknowledged` 순서로 조치 버킷별로 그룹화된 발견 사항별 항목, 그 다음 요약 카운트, 그 다음 Coverage, 마지막으로 판정.

### 발견 사항 0개 특수 케이스

`safe_auto` 후 `gated_auto` / `manual` 발견 사항이 남지 않아 라우팅 질문을 건너뀐 경우, 완료 보고서는 요약 카운트 + 판정 형식으로 축소되며 적용된 `safe_auto` 수정 사항 개수를 한 줄 추가합니다. 요약 문구는 `SKILL.md` Step 2 Interactive 모드의 잔존 발견 사항 0개 케이스를 따릅니다: `All findings resolved`라는 무조건적인 표현은 권고나 기존 이슈 발견 사항이 남아 있지 않을 때만 정확합니다. 권고 및/또는 기존 이슈 발견 사항이 보고서에 남아 있는 경우, 무엇이 해결되었고 무엇이 남아 있는지 명시하는 조건부 표현을 사용하십시오. 예시:

잔존 권고 또는 기존 이슈 발견 사항 없음:

```
All findings resolved — 3 safe_auto fixes applied.

Verdict: Ready with fixes.
```

권고 및/또는 기존 이슈 발견 사항이 보고서에 남아 있음:

```
All actionable findings resolved — 3 safe_auto fixes applied. (2 advisory, 1 pre-existing findings remain in the report.)

Verdict: Ready with fixes.
```

---

## 실행 자세 (Execution posture)

워크스루는 두 가지 허용된 쓰기 작업을 제외하고 운영상 읽기 전용입니다: 메모리 내 Apply 세트 / 결정 목록 (오케스트레이터가 관리) 및 트래커 지연 실행 (외부 티켓 생성, `tracker-defer.md`에 설명됨). 페르소나 에이전트들은 엄격하게 읽기 전용 상태를 유지합니다. 워크스루 종료 시의 수정자 실행은 파일 수정이 발생하는 유일한 지점이며, 이는 `SKILL.md`에 있는 기존 Step 3 수정자 계약에 의해 관리됩니다.
