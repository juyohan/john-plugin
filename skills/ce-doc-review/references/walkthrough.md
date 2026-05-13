# Per-finding Walk-through (발견 사항별 워크스루)

이 참조 문서는 Interactive 모드의 발견 사항별 워크스루를 정의합니다. 이는 사용자가 라우팅 질문에서 옵션 A(`Review each finding one by one — accept the recommendation or choose another action`)를 선택했을 때 진입하는 경로와, 모든 종료 경로(워크스루, 최선의 판단, Open Questions 추가, 발견 사항 없음)에서 내보내는 통합 완료 보고서를 포함합니다.

Interactive 모드 전용입니다.

---

## 라우팅 질문 (진입점) (Routing question)

`safe_auto` 수정 사항이 적용되고 합성을 통해 남은 발견 사항 세트가 생성된 후, 오케스트레이터는 워크스루나 일괄 작업을 실행하기 전에 4가지 옵션의 라우팅 질문을 던집니다.

플랫폼의 블로킹 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하십시오. Claude Code에서는 `SKILL.md`의 Interactive 모드 프리로드 단계에서 도구가 이미 로드되어 있어야 합니다 — 로드되지 않은 경우 지금 `ToolSearch`를 호출하여 `select:AskUserQuestion`을 수행하십시오. 하네스에 블로킹 도구가 실제로 없는 경우에만 번호가 매겨진 리스트로 옵션을 제시하십시오. 스키마 로드 대기 중인 상태는 폴백 트리거가 아닙니다. 절대로 질문을 자동으로 건너뛰지 마십시오. 라우팅 질문을 번호 매겨진 리스트 폴백 없이 내레이션 텍스트로만 렌더링하는 것은 버그입니다.

**질문:** `What should the agent do with the remaining N findings?`

**옵션 (고정된 순서; 어떤 옵션도 `(recommended)` 레이블을 갖지 않음 — 라우팅 선택은 사용자의 의도에 따름):**

```
A. Review each finding one by one — accept the recommendation or choose another action
B. Auto-resolve with best judgment — apply per-finding edits the agent can defend, surface the rest
C. Append findings to the doc's Open Questions section and proceed
D. Report only — take no further action
```

발견 사항별 `(recommended)` 레이블은 워크스루(옵션 A) 및 일괄 미리보기(옵션 B/C) 내부에 존재하며, 합성 단계 3.5b의 `recommended_action`에 따라 각 발견 사항에 적용됩니다. 라우팅 질문 자체는 A/B/C/D 중 하나를 권장하지 않습니다. 올바른 경로는 발견 사항 세트의 모양이 아니라 사용자의 의도(참여 / 신뢰 / 분류 / 훑어보기)에 달려 있기 때문입니다. 발견 사항 세트의 모양을 라우팅 권장 사항에 매핑하는 규칙(예: "대부분의 발견 사항이 Apply 형태임 → 최선의 판단 권장")은 사용자의 의도 프레이밍과 충돌하는 방식으로 자동화된 경로를 선택하도록 사용자에게 압박을 줄 수 있습니다.

남은 발견 사항이 모두 FYI 하위 섹션 전용인 경우(앵커 `75` 또는 `100`인 `gated_auto` 또는 `manual` 발견 사항이 없는 경우), 라우팅 질문을 건너뛰고 Phase 5 최종 질문으로 이동합니다.

**추가 가용성 적응 (Append-availability adaptation).** Phase 4 시작 시 `references/open-questions-defer.md`에 `append_available: false`가 캐시된 경우(예: 읽기 전용 문서, 쓰기 불가능 파일 시스템), 모든 발견 사항별 Defer가 실패할 것이므로 라우팅 질문에서 옵션 C가 억제됩니다. 메뉴에는 세 가지 옵션(A / B / D)이 표시되고 질문 줄기에 그 이유를 설명하는 한 줄이 추가됩니다 (예: `Append to Open Questions unavailable — document is read-only in this environment.`). 이는 아래 "적응(Adaptations)" 섹션에서 설명하는 발견 사항별 옵션 B 억제와 유사합니다 — 라우팅 레벨과 발견 사항별 Defer 경로가 동일한 가용성 신호를 공유하여 사용자가 한 레벨에서는 Defer가 보이고 다른 레벨에서는 누락되는 것을 보지 않도록 합니다.

**선택에 따른 디스패치:**

- **A** — 이 워크스루(발견 사항별 루프)를 로드합니다. Apply 결정은 메모리에 누적됩니다. Open-Questions 지연은 `references/open-questions-defer.md`를 통해 인라인으로 실행됩니다. Skip 결정은 작업 없음으로 기록됩니다. `Auto-resolve with best judgment on the rest`는 `references/bulk-preview.md`를 통해 라우팅됩니다.
- **B** — 보류 중인 모든 `gated_auto` / `manual` 발견 사항으로 범위가 지정된 `references/bulk-preview.md`를 로드합니다. Proceed 시 계획을 실행합니다: Apply → 일괄 문서 편집; Open-Questions 지연 → `references/open-questions-defer.md`; Skip → 작업 없음. Cancel 시 라우팅 질문으로 돌아갑니다.
- **C** — 에이전트의 원래 권장 사항과 관계없이 보류 중인 모든 발견 사항을 Open-Questions 버킷에 담아 `references/bulk-preview.md`를 로드합니다. Proceed 시 모든 발견 사항을 `references/open-questions-defer.md`를 통해 라우팅하며, 문서 편집은 적용되지 않습니다. Cancel 시 라우팅 질문으로 돌아갑니다.
- **D** — 어떤 디스패치 단계에도 진입하지 않습니다. 완료 보고서를 내보내고 Phase 5 최종 질문으로 이동합니다.

---

## 진입 (워크스루 모드) (Entry)

워크스루는 오케스트레이터로부터 다음을 수신합니다:

- 심각도 순서(P0 → P1 → P2 → P3)로 정렬되고 실행 가능한 발견 사항(앵커 `75` 또는 `100`이며 `autofix_class`가 `gated_auto` 또는 `manual`)으로 필터링된 병합된 발견 사항 리스트. FYI 하위 섹션 발견 사항(앵커 `50`)은 포함되지 않습니다 — 이들은 최종 보고서에만 나타나며 워크스루 항목이 없습니다.
- 아티팩트 조회를 위한 실행 ID (해당하는 경우).
- 합성 단계 3.5c의 전제 조건 의존성 체인 주석: 각 발견 사항은 `depends_on: <root_id>` 또는 `dependents: [<ids>]`를 가질 수 있습니다.

각 발견 사항의 권장 작업은 이미 합성 단계 3.5b(결정론적 권장 작업 타이브레이크, `Skip > Defer > Apply`)에 의해 정규화되었습니다 — 워크스루는 병합된 발견 사항의 `recommended_action` 필드를 통해 해당 권장 사항을 표시하며 다시 계산하지 않습니다.

**루트 우선 반복 순서 (Root-first iteration order).** 발견 사항에 `dependents`가 있는 경우, 체인 내의 심각도 순서와 관계없이 종속 항목보다 먼저 루트를 반복합니다. 사용자의 루트 결정이 전파될 수 있도록 루트가 항상 먼저 옵니다.

**루트 결정 전파 (Cascading root decisions).** `dependents`가 있는 발견 사항에 대해 사용자가 Skip 또는 Defer를 선택한 경우:

1. 다음 질문을 던지기 전에 터미널에 전파 내용을 알립니다: "Skipping/Deferring this root will auto-resolve N dependent finding(s): {titles}. Continue?"
2. 두 가지 옵션이 있는 플랫폼의 블로킹 질문 도구를 사용합니다: `Cascade — apply same action to all dependents` (권장) 및 `Decide each dependent individually`. 레이블은 블로킹 질문 도구 설계 규칙에 따라 자체 설명적이어야 합니다.
3. Cascade 선택 시: 루트의 작업을 모든 종속 항목에 적용하고 해당 발견 사항들의 워크스루 항목을 건너뜁니다. 지속성은 아래 "발견 사항별 라우팅"의 작업별 라우팅 규칙을 따릅니다 — 모든 전파된 결정의 표준 보관소는 메모리 내 결정 리스트이며(`cascaded from {root_title}` 및 전파된 작업이 주석으로 달림), 작업별 부수 효과가 추가됩니다:
   - 전파된 `Apply` — 종속 항목 ID를 Apply 세트에 추가하고 결정 리스트에 기록합니다.
   - 전파된 `Defer` — 종속 항목에 대해 Open Questions 추가 흐름을 호출하고 결과 내용을 결정 리스트에 기록합니다. 추가에 실패하면 전파를 계속하기 전에 해당 종속 항목에 대해 발견 사항별 실패 경로(Retry / Record only / Convert to Skip)로 폴백합니다.
   - 전파된 `Skip` — 결정 리스트에만 기록하며, Apply 세트 추가나 Open Questions 추가는 수행하지 않습니다.

   Individual 선택 시: 정상적으로 진행합니다 — 루트의 종속 항목들은 각각 자신의 워크스루 항목을 갖게 됩니다.

사용자가 루트에 대해 Apply를 선택한 경우, 전파하지 **않습니다** — 전제가 유지되었으므로 종속 항목들은 각각 자신의 결정이 필요합니다. 정상적으로 워크스루를 진행합니다.

**고아가 된 종속 항목 (Orphaned dependents).** 종속 항목의 루트가 이전 라운드에서 거부되었고 이번 라운드에 억제된 경우(R29에 따라), 해당 종속 항목을 체인 컨텍스트가 없는 독립적인 발견 사항으로 취급합니다. 누락된 루트를 참조하지 마십시오.

---

## 발견 사항별 프레젠테이션 (Per-finding presentation)

각 발견 사항은 두 부분으로 제시됩니다: 설명을 담은 터미널 출력 블록과 결정을 내리는 플랫폼의 블로킹 질문 도구입니다. 두 부분을 절대 병합하지 마십시오 — 터미널 블록은 마크다운을 사용하고, 질문은 일반 텍스트를 사용합니다.

### 터미널 출력 블록 (질문을 던지기 전에 출력)

마크다운으로 렌더링합니다. 레이블은 별도의 줄에 표시하고, 섹션 사이에는 빈 줄을 둡니다:

```
## Finding {N} of {M} — {severity} {plain-English title}

Section: {section}

**What's wrong**

{plain-English problem statement from why_it_matters}

**Proposed fix**

{suggested_fix — 아래 치환 규칙에 따라 렌더링: 산문 우선, 의도 중심 언어}

**Why it works**

{단문으로 된 근거, 문서나 코드베이스에서 인용된 패턴에 기반 (가능한 경우)}

{충돌 컨텍스트 라인, 해당되는 경우 — 아래 참조}
```

치환 규칙:

- **`{plain-English title}`** — 헤더로 적합한 3~8단어 요약입니다. 병합된 발견 사항의 `title` 필드에서 유도하되 관찰 가능한 결과로 읽히도록 재구성합니다 (예: "Section X-Y lists four tiers" 대신 "Implementers will pick different tiers"). 문서 검토 발견 사항의 경우, 관찰 가능한 결과는 런타임 동작이 아니라 *독자, 구현자 또는 다운스트림 결정에 미치는 영향*입니다.
- **`{section}`** — 발견 사항의 `section` 필드에서 가져옵니다.
- **`why_it_matters`** — 병합된 발견 사항의 `why_it_matters` 필드에서 가져옵니다. 있는 그대로 렌더링합니다. 서브 에이전트 템플릿의 프레이밍 가이드에 따라 이미 관찰 가능한 결과 우선으로 작성되어 있을 것입니다.
- **`suggested_fix`** — 병합된 발견 사항의 `suggested_fix` 필드에서 가져옵니다. 가공되지 않은 마크업이 아닌 의도를 설명하는 산문으로 렌더링합니다. 사용자의 역할은 작업을 신뢰하거나 거부하는 것이지 정확한 텍스트를 검토하는 것이 아닙니다. 규칙:
  - **기본값 — 효과를 설명하는 한 문장.** 수정 사항이 무엇을 달성하며 어디에 위치합니까? 인용된 텍스트보다 의도 중심 언어를 선호하십시오.
    - 권장: `Drop the Advisory tier from the enum; advisory-style findings surface in an FYI subsection at the presentation layer.`
    - 권장: `Add a deployment-ordering constraint requiring Units 3 and 4 in a single commit.`
    - 비권장: `Change "autofix_class: [auto, gated_auto, advisory, present]" to "autofix_class: [safe_auto, gated_auto, manual]" in findings-schema.json on line 48.` — 결정 루프에 비해 너무 구문 중심적임
  - **코드 스팬 예산** — 문장당 최대 2개의 인라인 백틱 스팬. 각각은 단일 식별자, 플래그 또는 짧은 문구여야 합니다 (예: `` `safe_auto` ``, `` `<work-context>` ``). 각 백틱 스팬 전후에 항상 공백을 두십시오.
  - **원시 코드 블록** — 이전 상태가 존재하지 않는 짧은 (5줄 이하) 순수 추가 내용에만 사용합니다. 5줄을 초과하면 요약으로 전환하십시오.
  - **diff 블록 사용 금지.** 문서 변경 사항은 산문으로 렌더링합니다.
- **`Why it works`** — 문서나 코드베이스에서 이미 사용된 유사한 패턴을 가능한 경우 참조하는 근거 있는 이유입니다. 1~3문장으로 작성합니다.
- **충돌 컨텍스트 라인 (해당되는 경우)** — 기여 페르소나들이 이 발견 사항에 대해 서로 다른 작업을 암시했고 합성 단계 3.6에서 타이브레이크가 발생한 경우, 이를 짧게 표시합니다. 예: `Coherence recommends Apply; scope-guardian recommends Skip. Agent's recommendation: Skip.` 오케스트레이터의 권장 사항 — 타이브레이크 후의 값 — 이 메뉴에서 "recommended"로 표시되는 대상입니다.

### 질문 줄기 (스템) (짧고 결정 중심적)

터미널 블록 렌더링 후, 플랫폼의 블로킹 질문 도구를 사용하여 간결한 두 줄의 스템을 던집니다:

```
Finding {N} of {M} — {severity} {short handle}.
{Action framing in a phrase}?
```

설명:

- **Short handle**은 터미널 블록 헤더의 `{plain-English title}`과 일치합니다.
- **Action framing** — 단일 권장 작업이 수행하는 내용을 설명하는 한 문구이며, 예/아니오 질문 형태입니다. 예시: `Apply the rename?`, `Defer to Open Questions since the tradeoff is genuine?`, `Skip since the document already resolves this elsewhere?`.

스템에서 대안을 열거하지 마십시오. 하나의 권장 사항을 예/아니오로 묻습니다 — 대안은 옵션 리스트에 포함되어 있습니다. 권장 사항이 아슬아슬하게 결정된 경우, 다중 옵션 스템이 아닌 충돌 컨텍스트 라인에서 의견 차이를 표시하십시오.

### 발견 사항 간 확인 메시지

사용자가 응답한 후 다음 발견 사항의 터미널 블록을 출력하기 전에, 취해진 작업에 대한 한 줄 확인 메시지를 내보냅니다. 예시: `→ Applied. Edit staged at "Scope Boundaries" section.`, `→ Deferred. Entry appended to "## Deferred / Open Questions".`, `→ Skipped.`

### 옵션 (네 가지; 상황에 따라 조정됨)

이 네 가지 옵션은 정규 발견 사항별 질문을 위한 **완전하고 배타적인 세트**입니다. 순서 고정 — 절대 순서를 바꾸거나, 추가하거나, 대체하지 마십시오. 특히, **`Acknowledge`는 이 옵션 중 하나가 아닙니다** — 이는 아래 "발견 사항별 라우팅"에서 설명하는 no-fix 하위 질문에만 나타나며, 사용자가 `suggested_fix`가 없는 발견 사항에 대해 Apply를 선택했을 때만 실행됩니다. `Acknowledge`를 정규 메뉴에 (D 대신 또는 다섯 번째 옵션으로) 가져오는 것은 버그입니다 — 이는 `Auto-resolve with best judgment on the rest` 워크플로 단축키를 무음으로 누락시키고, 완료 보고서의 버킷 카운트에서 사용자의 선택을 잘못 분류하게 만듭니다.

```
A. Apply the proposed fix
B. Defer — append to the doc's Open Questions section
C. Skip — don't apply, don't append
D. Auto-resolve with best judgment on the rest
```

**타이브레이크 이후의 권장 사항에 대해 옵션 레이블에 `(recommended)`를 표시하십시오.** 이는 선택 사항이 아닌 필수 사항입니다. A, B, C 중 하나만 가질 수 있습니다 — 합성은 `recommended_action`을 Apply/Defer/Skip으로 내보내며 이는 A/B/C에 매핑됩니다. D (`Auto-resolve with best judgment on the rest`)는 남은 발견 사항들에 대한 일괄 실행을 위한 워크플로 단축키이지 발견 사항 레벨의 해결 작업이 아니므로 절대로 `(recommended)` 표시를 하지 않습니다.

```
A. Apply the proposed fix  (recommended)
B. Defer — append to the doc's Open Questions section
C. Skip — don't apply, don't append
D. Auto-resolve with best judgment on the rest
```

검토자들이 의견이 다르거나 증거가 기본값에 반하더라도, 합성이 생성한 단 하나의 옵션을 마킹하고 충돌 컨텍스트 라인에 의견 차이를 표시하십시오.

### 적응 (Adaptations)

- **N=1 (보류 중인 발견 사항이 정확히 하나인 경우):** 터미널 블록의 헤더에서 `Finding N of M`을 생략하고 `## {severity} {plain-English title}`로 렌더링합니다. 스템의 첫 번째 줄에서 위치 카운터를 생략하여 `{severity} {short handle}.`이 됩니다. 후속 발견 사항이 없으므로 옵션 D (`Auto-resolve with best judgment on the rest`)는 억제됩니다 — 메뉴에는 Apply / Defer / Skip 세 가지 옵션이 표시됩니다.

- **Open Questions 추가 불가** (읽기 전용 문서, 쓰기 실패): `references/open-questions-defer.md`에서 문서 내 추가 메커니즘을 실행할 수 없다고 보고하면 옵션 B가 제외됩니다. 스템에 그 이유를 설명하는 한 줄이 추가됩니다 (예: `Defer unavailable — document is read-only in this environment.`). 메뉴에는 Apply / Skip / Auto-resolve with best judgment on the rest 세 가지 옵션이 표시됩니다. 옵션을 렌더링하기 전에, 합성에서의 모든 발견 사항별 `Defer` 권장 사항을 `Skip`으로 리매핑하여 `(recommended)` 마커가 실제로 메뉴에 있는 옵션에 표시되도록 합니다. 리매핑 내용은 충돌 컨텍스트 라인에 표시합니다 (예: `Synthesis recommended Defer; downgraded to Skip — document is read-only.`).

- **N=1 + 추가 불가 결합:** 메뉴에는 Apply / Skip 두 가지 옵션이 표시됩니다.

`ToolSearch`가 명시적으로 검색 결과 없음을 반환하거나 도구 호출이 에러를 발생시키는 경우 — 또는 블로킹 질문 도구가 없는 플랫폼에서만 — 번호가 매겨진 리스트로 옵션을 제시하고 사용자의 다음 응답을 기다리는 방식으로 폴백합니다.

---

## 발견 사항별 라우팅 (Per-finding routing)

각 발견 사항에 대한 응답 처리:

- **Apply the proposed fix** — 발견 사항의 ID를 메모리 내 Apply 세트에 추가합니다. 다음 발견 사항으로 넘어갑니다. 문서를 인라인으로 편집하지 마십시오 — Apply는 워크스루 종료 시 일괄 실행을 위해 누적됩니다. **수정안 부재 보호 (No-fix guard):** 병합된 발견 사항에 `suggested_fix`가 없는 경우(페르소나가 구체적인 해결책 없이 관찰로만 이슈를 제기한 `manual` 발견 사항에서 가능), Apply를 실행할 수 없습니다. 발견 사항을 Apply 세트에 추가하지 마십시오. 대신 아래에 설명된 no-fix 하위 질문을 표시한 후 진행하십시오.
- **Defer — append to Open Questions section** — `references/open-questions-defer.md`의 추가 흐름을 호출합니다. 실패 경로 하위 질문(Retry / Fall back / Convert to Skip) 중에도 워크스루의 위치 표시기는 현재 발견 사항에 머뭅니다. 성공 시 추가 위치와 참조를 메모리 내 결정 리스트에 기록하고 넘어갑니다. 실패 경로에서 Skip으로 전환된 경우, 완료 보고서에 실패 내용을 기록하고 넘어갑니다.
- **Skip — don't apply, don't append** — 메모리 내 결정 리스트에 Skip을 기록합니다. 넘어갑니다. 부수 효과가 없습니다.
- **Auto-resolve with best judgment on the rest** — 워크스루 루프를 종료합니다. 현재 발견 사항과 아직 결정되지 않은 모든 사항을 범위로 하여 `references/bulk-preview.md`의 일괄 미리보기를 디스패치합니다. 미리보기 헤더는 이미 결정된 발견 사항의 수("K already decided")를 보고합니다. 사용자가 미리보기에서 Cancel을 선택하면 (라우팅 질문이 아닌) 현재 발견 사항의 질문으로 돌아갑니다. 사용자가 Proceed를 선택하면 `references/bulk-preview.md`에 따라 계획을 실행합니다 — Apply 발견 사항은 사용자가 이미 선택한 것들과 함께 메모리 내 Apply 세트에 합쳐지고, Defer 발견 사항은 `references/open-questions-defer.md`를 통해 라우팅되며, Skip은 무시됩니다 — 그 후 워크스루 종료 후 실행 단계로 진행합니다.

### No-fix 하위 질문 (수정안이 없는 발견 사항에 대해 Apply를 선택한 경우)

이 하위 질문 — 특히 `Acknowledge without applying` 옵션 — 은 **no-fix 경로 전용**입니다. 이는 병합된 레코드에 `suggested_fix`가 없는 발견 사항에 대해 사용자가 Apply를 선택한 경우에만 실행됩니다. 이 하위 질문이나 `Acknowledge` 옵션을 정규 발견 사항별 메뉴에 표시하지 마십시오. 정규 메뉴의 네 번째 옵션은 항상 `Auto-resolve with best judgment on the rest`이며 (위 "옵션" 섹션 참조), 절대 `Acknowledge`가 아닙니다.

합성 단계 3.5b는 `suggested_fix`가 없는 모든 병합된 발견 사항에 대해 기본 권장 사항을 Apply에서 Defer로 강등하므로, 이러한 발견 사항들에 대해 `(recommended)`가 Apply에 표시되는 일은 없습니다. 하지만 메뉴에서는 여전히 사용자가 수동으로 Apply를 선택할 수 있습니다. 그런 일이 발생하면 발견 사항을 Apply 세트에 추가하지 마십시오 — 실행 단계에서 적용할 편집 페이로드가 없으므로 일괄 처리에 실패하거나 오해의 소지가 있는 "applied" 결과를 기록하게 될 것이기 때문입니다.

플랫폼의 질문 도구를 사용하여 블로킹 하위 질문을 던집니다. 스템은 왜 Apply를 실행할 수 없는지 한 줄로 설명하고, 세 가지 자체 설명적인 옵션을 제공합니다. 하위 질문이 열려 있는 동안 위치 표시기는 현재 발견 사항에 머뭅니다.

**질문:** `Apply isn't executable for this finding — the review surfaced the issue without a concrete fix. How should the agent proceed?`

**옵션 (고정된 순서):**

```
A. Defer to Open Questions  (recommended)
B. Skip — don't apply, don't append
C. Acknowledge without applying — record the decision, no document edit
```

**라우팅:**

- **A. Defer to Open Questions** — 사용자가 원래 Defer를 선택한 것처럼 `references/open-questions-defer.md`의 추가 흐름을 호출합니다. 실패 경로 처리는 동일합니다 (Retry / Fall back / Convert to Skip). 성공 시 결정 리스트에 추가 위치를 기록하고(`redirected from Apply — no suggested_fix` 주석 포함) 넘어갑니다.
- **B. Skip** — 결정 리스트에 Skip을 기록하고(`redirected from Apply — no suggested_fix` 주석 포함) 넘어갑니다. 부수 효과가 없습니다.
- **C. Acknowledge without applying** — 결정 리스트에 해당 발견 사항을 `acknowledged`로 기록합니다(`Apply picked but no suggested_fix — no edit dispatched` 주석 포함). Apply 세트에 추가하지 않습니다. 넘어갑니다. 완료 보고서는 Acknowledged를 자체적인 카운트, 발견 사항별 작업 레이블 및 보고서 정렬 순서(`Applied / Deferred / Skipped / Acknowledged`)상의 고유한 위치를 가진 전용 버킷으로 표시합니다 — 전체 계약 내용은 아래 통합 완료 보고서 섹션의 "최소 필수 필드" 및 "보고서 정렬"을 참조하십시오. 각 발견 사항별 라인에 승인 이유가 표시됩니다. (보고서 표시와는 별개인) 라운드 간 억제를 위해, Acknowledged 결정은 다라운드 결정 프라이머에서 Skip 및 Defer와 함께 거부 클래스 결정으로 전달되어 라운드-N+1 합성이 R29를 통해 재제기를 억제하도록 합니다 — 의미론적으로 사용자가 발견 사항을 보았고 조치하지 않기로 선택했으며 기록에 남기길 원하므로 억제 목적상 Skip과 동일하지만 보고서에서는 자신의 버킷을 유지합니다.

**가용성 적응.** 세션에 대해 `references/open-questions-defer.md`에 `append_available: false`가 캐시된 경우, 옵션 A를 생략하고 스템에 그 이유를 설명하는 한 줄을 표시합니다 (예: `Defer unavailable — document is read-only in this environment.`). 메뉴는 Skip / Acknowledge without applying이 되며, Skip에 `(recommended)` 레이블이 붙습니다.

**전파되는 루트 (Cascading roots).** 발견 사항이 종속 항목을 가진 루트이고 사용자가 이 하위 질문에서 A (Defer) 또는 B (Skip)를 선택한 경우, 위 "루트 결정 전파"의 전파 안내를 실행합니다 — 하위 질문의 선택을 루트의 실질적인 작업으로 취급합니다. 옵션 C (Acknowledge)는 전파되지 않습니다. 루트는 acknowledged로 기록되고 종속 항목들은 각각 자신의 워크스루 항목을 갖게 됩니다.

---

## 재정의 규칙 (Override rule)

"재정의(Override)"란 사용자가 미리 설정된 다른 작업(Apply 대신 Defer 또는 Skip, 또는 에이전트의 권장 사항 대신 Apply)을 선택하는 것을 의미합니다. 인라인으로 자유 형식의 커스텀 수정안을 작성하는 기능은 없습니다 — 워크스루는 결정 루프이지 페어 에디팅 화면이 아닙니다. 제안된 수정안의 변형을 원하는 사용자는 Skip을 선택하고 흐름 외부에서 수동으로 편집합니다. 발견 사항을 추적하고 싶다면 먼저 Defer를 한 다음 나중에 편집할 수 있습니다.

---

## 상태 (State)

워크스루 상태는 **메모리에만 유지**됩니다. 오케스트레이터는 다음을 관리합니다:

- Apply 세트 (사용자가 Apply를 선택한 발견 사항 ID들)
- 결정 리스트 (응답된 모든 발견 사항과 그 작업, 그리고 Deferred의 경우 `append_location`, Skipped의 경우 `reason`과 같은 메타데이터)
- 발견 사항 리스트에서의 현재 위치

문서 내 Open Questions 추가(이는 외부 부수 효과이며 롤백할 수 없음)를 제외하고는 결정마다 디스크에 아무것도 기록되지 않습니다. 중단된 워크스루(사용자가 프롬프트 취소, 세션 압축, 네트워크 중단)는 모든 메모리 내 상태를 폐기합니다. Apply 결정은 아직 실행되지 않았으므로(워크스루 종료 시 일괄 처리됨), 문서 변경 없이 깔끔하게 사라집니다.

세션 간 지속성은 범위 밖입니다. `ce-code-review`의 워크스루 상태 규칙을 미러링합니다.

---

## 워크스루 종료 후 실행 (End-of-walk-through execution)

루프가 종료된 후 — 모든 발견 사항에 응답했거나 사용자가 `Auto-resolve with best judgment on the rest → Proceed`를 선택한 경우 — 워크스루는 실행 단계로 제어권을 넘깁니다:

1. **Apply 세트:** 오케스트레이터는 누적된 모든 Apply 세트 발견 사항의 `suggested_fix`를 단일 패스로 문서에 적용합니다. 문서 편집은 플랫폼의 편집 도구를 통해 인라인으로 이루어집니다 — ce-doc-review에는 (범위 경계에 따라) 일괄 수정 서브 에이전트가 없으며, 문서에 대한 `gated_auto` 및 `manual` 수정은 파일 간 의존성이 없는 단일 파일 마크다운 변경이므로 오케스트레이터가 직접 편집을 수행합니다. **방어적 수정안 부재 확인:** 각 Apply 세트 항목에 대해 편집을 디스패치하기 전에 병합된 발견 사항이 `suggested_fix`를 가지고 있는지 확인합니다. 가지고 있지 않은 경우 ("발견 사항별 라우팅"의 결정 시점 가드가 이를 방지해야 하지만 방어적 폴백으로 처리함), 편집을 건너뛰고 `Apply skipped — no suggested_fix available` 이유와 함께 완료 보고서의 실패 섹션에 기록한 후 일괄 처리를 계속합니다. 하나의 항목에 수정안이 없다고 해서 전체 패스를 실패시키지 마십시오.
2. **Defer 세트:** 이미 워크스루 중에 `references/open-questions-defer.md`를 통해 인라인으로 실행되었습니다. 여기서 디스패치할 것은 없습니다.
3. **Skip:** 작업 없음.

실행이 완료된 후 (또는 `Auto-resolve with best judgment on the rest → Cancel` 이후 사용자가 남은 발견 사항들을 하나씩 처리한 후, 또는 루프가 완료될 때까지 실행된 후), 아래에 설명된 통합 완료 보고서를 내보냅니다.

---

## 통합 완료 보고서 (Unified completion report)

Interactive 모드의 모든 종료 경로는 동일한 완료 보고서 구조를 내보냅니다. 이는 다음을 포함합니다:

- 워크스루 완료 (모든 발견 사항에 응답함)
- `Auto-resolve with best judgment on the rest → Proceed`를 통한 워크스루 이탈
- 최상위 최선의 판단 (라우팅 옵션 B) 완료
- 최상위 미결 질문 추가 (라우팅 옵션 C) 완료
- `safe_auto` 이후 발견 사항 없음 (라우팅 질문 건너뜀 — 완료 요약은 이 구조의 한 줄짜리 축소 케이스임)

### 최소 필수 필드

- **발견 사항별 항목:** 흐름이 터치한 모든 발견 사항에 대해 최소한 제목, 심각도, 취해진 작업(Applied / Deferred / Skipped / Acknowledged), Deferred 항목의 추가 위치, Skipped 항목의 한 줄 이유(발견 사항의 신뢰도 앵커나 한 줄 `why_it_matters` 스니펫에 기반), Acknowledged 항목의 승인 이유(예: `Apply picked but no suggested_fix available`)를 포함한 라인.
- **작업별 요약 카운트:** 버킷별 합계 (예: `4 applied, 2 deferred, 2 skipped`). 해당 버킷에 항목이 있는 경우 `acknowledged` 카운트를 포함하고, 카운트가 0인 레이블은 생략합니다.
- **명시적으로 호출된 실패:** 실패한 모든 Apply (예: 문서 쓰기 에러 또는 방어적 no-fix 폴백으로 건너뛴 항목), 실패한 모든 Open-Questions 추가. 실패 내용은 발견 사항별 리스트 위에 표시하여 놓치지 않도록 합니다.
- **검토 종료 판결 (Verdict):** Phase 4의 Coverage 섹션에서 가져옵니다.

### 보고서 정렬

실패 내용을 먼저 표시하고(발견 사항별 리스트 위), 그 다음 `Applied / Deferred / Skipped / Acknowledged` 순서의 작업 버킷별로 그룹화된 발견 사항별 항목, 그 다음 요약 카운트, 그 다음 Coverage (FYI 관찰, 잔류 우려 사항), 마지막으로 판결(verdict) 순으로 정렬합니다. 카운트가 0인 버킷은 생략합니다.

### 발견 사항 없음 축소 케이스 (Zero-findings degenerate case)

`safe_auto` 이후 앵커 `75` 또는 `100`인 `gated_auto` / `manual` 발견 사항이 남지 않아 라우팅 질문을 건너뛴 경우, 완료 보고서는 요약 카운트 + 판결 형태로 축소되며 적용된 `safe_auto` 수정 사항 카운트가 한 줄 추가됩니다. 요약 문구:

FYI나 잔류 우려 사항이 없는 경우:

```
All findings resolved — 3 fixes applied.

Verdict: Ready.
```

FYI나 잔류 우려 사항이 남은 경우:

```
All actionable findings resolved — 3 fixes applied. (2 FYI observations, 1 residual concern remain in the report.)

Verdict: Ready.
```

---

## 실행 자세 (Execution posture)

워크스루는 프로젝트에 대해 운영상 읽기 전용이지만, 세 가지 허용된 쓰기가 있습니다: 메모리 내 Apply 세트 / 결정 리스트 (오케스트레이터가 관리), 문서 내 Open Questions 추가 ( `references/open-questions-defer.md`가 관리하는 외부 부수 효과), 그리고 워크스루 종료 후 일괄 문서 편집 (오케스트레이터의 최종 Apply 패스). 페르소나 에이전트들은 엄격하게 읽기 전용 상태를 유지합니다. `ce-code-review`와 달리 수정자(fixer) 서브 에이전트가 없으며, 오케스트레이터가 직접 문서 편집을 수행합니다.
