# 트래커 감지 및 지연 실행 (Tracker Detection and Defer Execution)

이 레퍼런스는 '지연(Defer)' 조치가 프로젝트의 트래커(tracker)에 어떻게 티켓을 생성하는지를 다룹니다. `SKILL.md`에서 대화형(Interactive) 모드의 라우팅 질문이 옵션 C(티켓 생성)를 제공할지 결정할 때, 워크스루의 지연 옵션이 실행될 때, 그리고 옵션 C의 대량 미리보기(bulk-preview)가 표시될 때 로드됩니다. 또한 사용자의 프롬프트 없이 잔여 발견 사항을 티켓으로 생성해야 하는 자율 호출자(예: `lfg`)에 의해서도 로드됩니다 — 아래의 실행 모드 섹션을 참조하십시오.

---

## 실행 모드 (Execution Modes)

트래커 지연(tracker-defer) 기능에는 두 가지 실행 모드가 있습니다. 호출자가 하나를 선택하며, 감지, 폴백 체인(fallback chain) 및 티켓 구성 방식은 공유됩니다.

### 대화형 모드 (Interactive mode, 기본값)

`ce-code-review` 대화형 모드의 라우팅 질문, 워크스루 지연 조치 및 대량 미리보기 옵션 C에서 사용됩니다. 모든 사용자 대상 프롬프트가 실행됩니다:

- 세션의 첫 번째 지연 조치 시, 이름이 지정되지 않은 범용 레이블인 경우 유효한 트래커 선택 사항을 확인합니다.
- 실행 실패 시 재시도(Retry) / 다음 저장소로 폴백(Fall back to next sink) / 건너뛰기로 전환(Convert to Skip) 프롬프트를 띄웁니다.
- 라우팅 질문의 레이블에 `named_sink_available` 여부를 반영합니다 (이름이 지정된 트래커 vs 범용 폴백).

### 비대화형 모드 (Non-interactive mode)

사용자에게 물어보지 않아야 하는 `lfg`와 같은 자율 호출자에 의해 사용됩니다. 모든 차단형 질문을 건너뛰며, 폴백 체인이 조용히 순서대로 실행됩니다. 동작 방식:

- 범용 레이블 지연 조치 시 확인 과정 없이 즉시 진행합니다.
- 실행 실패 시 프롬프트 없이 자동으로 다음 단계로 폴백합니다. 실패 기록은 남깁니다.
- 체인의 모든 단계가 실패하거나 사용 가능한 저장소가 없는 경우, 호출자가 다른 곳에 노출할 수 있도록 `no_sink` 버킷에 발견 사항을 담아 반환합니다 (예: PR 본문에 인라인으로 포함).
- 구조화된 결과물을 반환합니다: `{ filed: [{ finding_id, tracker, url }], failed: [{ finding_id, tracker, reason }], no_sink: [{ finding_id, title, severity, file, line }] }`.

결과를 사용자에게 어떻게 보여줄지는 호출자가 결정합니다. 비대화형 모드에서는 "사용 가능한 저장소 없음"을 프롬프트 트리거가 아닌 데이터 생성 결과로 취급합니다.

---

## 감지 (Detection)

에이전트는 프로젝트의 트래커를 문서화된 내용에서 판단합니다. 주요 소스는 리포지토리 루트 및 관련 하위 디렉토리에 있는 `CLAUDE.md`와 `AGENTS.md`입니다. 보조 신호로는 (주요 문서가 모호할 경우) `CONTRIBUTING.md`, `README.md`, `.github/` 하위의 PR 템플릿, 리포지토리에 노출된 트래커 URL 등이 있습니다.

트래커는 MCP 도구(예: Linear MCP 서버), CLI(예: `gh`), 또는 직접적인 API를 통해 노출될 수 있습니다. 모든 방식이 허용됩니다. 감지 결과는 이름이 지정된 특정 트래커의 가용성 플래그(대화형 모드에서 레이블 신뢰도 결정)와 전체 폴백 체인의 가용성 플래그(지연 옵션 제공 여부 결정)를 포함한 튜플로 반환됩니다:

```
{ tracker_name, confidence, named_sink_available, any_sink_available }
```

항목 설명:
- `tracker_name` — 사람이 읽을 수 있는 이름 ("Linear", "GitHub Issues", "Jira"), 또는 감지되지 않은 경우 `null`
- `confidence` — 트래커가 문서에 명시적으로 명명되었고 (또는 특정 프로젝트/워크스페이스로 연결되는 URL이 있고) 의심의 여지 없이 프로젝트의 공식 트래커인 경우 `high`, 신호가 부족하거나 상충되거나 암시만 된 경우 `low`
- `named_sink_available` — 에이전트가 감지된 트래커를 실제로 호출할 수 있는 경우(MCP 도구 로드됨, CLI 인증됨, 또는 API 자격 증명이 환경 변수에 있음)에만 `true`, 문서에는 있지만 도구가 도달할 수 없거나 트래커가 감지되지 않은 경우 `false`. 레이블 신뢰도를 결정합니다: 인라인 트래커 이름을 표시하려면 이 값이 `true`여야 합니다.
- `any_sink_available` — 이름이 지정된 트래커 또는 `gh`를 통한 GitHub Issues 중 이번 세션에서 하나라도 호출할 수 있는 경우 `true`. 대화형 모드에서 지연 옵션을 제공할지 여부와 비대화형 모드에서 `no_sink` 버킷 결정에 사용됩니다.

감지는 추론 기반입니다. 읽어야 할 파일 목록을 고정하여 유지하지 마십시오. 명확한 소스들을 읽고 확신 있는 결론을 내리십시오. 명확한 소스에서 해결되지 않으면 레이블은 범용 문구로 폴백하며, 에이전트는 실행 전 사용자에게 확인을 요청합니다 (대화형 모드 전용).

---

## 프로브 타이밍 및 캐싱 (Probe timing and caching)

가용성 조사(probes)는 **세션당 최대 한 번**만 실행되며, **지연 조치 실행이 임박했을 때만** 수행됩니다. 리뷰 시작 시점에 미리 조사하거나, 지연 조치마다 또는 워크스루의 발견 사항마다 매번 조사하지 마십시오. 캐싱된 튜플은 동일한 실행 내의 모든 지연 조치에 재사용됩니다.

전형적인 조사 순서:

1. `CLAUDE.md` / `AGENTS.md`에서 트래커 참조를 읽습니다. 발견되지 않으면 `tracker_name = null`, `confidence = low`로 설정합니다.
2. **이름이 지정된 트래커가 있다면 이를 조사합니다.** GitHub Issues의 경우 `gh auth status` 및 `gh repo view --json hasIssuesEnabled`를 실행합니다. Linear 등 MCP 기반 트래커의 경우 관련 MCP 도구가 로드되어 있고 응답하는지 확인합니다. API 기반 트래커의 경우 환경 변수에서 자격 증명을 확인합니다. 조사 결과에 따라 `named_sink_available`을 설정합니다.
3. **`any_sink_available` 계산을 위해 GitHub Issues 폴백을 조사합니다.** 이름이 지정된 트래커가 발견되어 조사되었더라도 `gh` 상태는 중요합니다. 문서화된 트래커가 없더라도 `gh`가 작동한다면 지연 옵션을 제공해야 하기 때문입니다.
   - `named_sink_available = true`인 경우: `any_sink_available = true` (추가 조사 불필요).
   - 그렇지 않은 경우, `gh auth status` + `gh repo view --json hasIssuesEnabled`를 통해 GitHub Issues를 조사합니다 (2단계에서 이미 조사했다면 건너뜁니다). 작동하면 `any_sink_available = true`.
   - 작동하지 않으면 `any_sink_available = false`.

대화형 모드의 라우팅 질문이 건너뛰어지는 경우(R2 발견 사항 없음), 조사는 실행되지 않습니다. 캐싱된 튜플이 세션 전체에서 재사용될 때, 세션의 첫 조사에서 `named_sink_available = true`였다면 계속 유지됩니다 — 지연 조치마다 재조사하지 마십시오.

---

## 레이블 로직 (Interactive mode)

- `confidence = high` 이고 `named_sink_available = true`인 경우: 라우팅 질문의 옵션 C와 워크스루의 개별 발견 사항 지연 옵션 모두에 트래커 이름을 그대로 포함합니다. 예: `File a Linear ticket per finding`, `Defer — file a Linear ticket`.
- `any_sink_available = true` 이지만 `confidence = low` 이거나 `named_sink_available = false`인 경우 (폴백 단계의 저장소가 대신 작동 중임): 레이블을 범용적으로 표시합니다 — `File an issue per finding`, `Defer — file a ticket`. 세션의 첫 번째 지연 조치를 실행하기 전에, 에이전트는 플랫폼의 차단형 질문 도구를 사용하여 유효한 트래커 선택 사항을 사용자에게 확인합니다.
- `any_sink_available = false`인 경우: 라우팅 질문에서 옵션 C가 제외되고, 워크스루의 개별 발견 사항 옵션에서 옵션 B(지연)가 제외됩니다. 에이전트는 라우팅 질문의 요지(stem)에서 사용자에게 그 이유를 설명합니다.

비대화형 모드는 레이블 결정을 건너뛰고 감지된 저장소에 대해 조용히 작업을 수행합니다.

---

## 폴백 체인 (Fallback chain)

이름이 지정된 트래커를 사용할 수 없거나 감지되지 않은 경우, 다음 순서대로 폴백합니다. 프로젝트에서 감지된 트래커를 우선 사용하며, 감지된 트래커가 없거나 도달할 수 없는 경우에만 `gh`를 사용하십시오.

1. **이름이 지정된 트래커 (Named tracker)** (감지를 통해 확인된, 에이전트가 직접 호출할 수 있는 MCP 도구, CLI 또는 API)
2. **GitHub Issues (gh 사용)** — `gh auth status`가 성공하고 현재 리포지토리에 이슈 기능이 활성화된 경우 (`gh repo view --json hasIssuesEnabled`가 `true` 반환)
3. **저장소 없음 (No sink)** — 발견 사항은 리뷰 리포트의 잔여 작업 섹션에 남거나(대화형 모드), 호출자가 라우팅할 수 있도록 `no_sink` 버킷에 담겨 반환됩니다(비대화형 모드). 에이전트는 이를 휘발성 표면에 다시 표시하지 않습니다.

이전에는 체인에 세 번째 세션 내(in-session) 폴백 단계가 있었으나, 세션 내 작업은 세션이 끝나면 사라지므로 '내구성 있는 등록'이라는 지연 조치의 의도에 맞지 않아 삭제되었습니다. 내구성 있는 트래커가 없는 경우의 올바른 동작은 리포트에 남기거나(Interactive) 호출자에게 반환하는 것(Non-interactive)입니다.

---

## 티켓 구성 (Ticket composition)

모든 지연 조치는 트래커의 기능에 맞춰 다음 내용을 포함한 티켓을 생성합니다:

- **제목 (Title):** 병합된 발견 사항의 `title` (스키마에 따라 10단어 이내로 제한).
- **본문 (Body):**
  - 평이한 영어로 작성된 문제 설명 — `/tmp/compound-engineering/ce-code-review/<run-id>/{reviewer}.json`에 있는 리뷰어 아티팩트 파일에서 페르소나가 생성한 `why_it_matters`를 읽어옵니다. 헤드리스 모드와 동일한 `file + line_bucket(line, +/-3) + normalize(title)` 매칭 방식을 사용합니다 (SKILL.md Stage 6 상세 보완 참조). 아티팩트 매칭이 불가능한 경우, 병합된 발견 사항의 `title`, `severity`, `file`, `suggested_fix`(있는 경우)로 폴백합니다 — 이 필드들은 병합 단계의 콤팩트한 반환 결과에 포함됨이 보장됩니다.
  - 제안된 수정 사항 (발견 사항에 `suggested_fix`가 있는 경우).
  - 증거 (리뷰어 아티팩트의 직접 인용구).
  - 메타데이터 블록: `Severity: <level>`, `Confidence: <score>`, `Reviewer(s): <list>`, `Finding ID: <fingerprint>`.
- **레이블 (Labels)** (트래커가 지원하는 경우): 심각도 태그 (`P0`, `P1`, `P2`, `P3`) 및 트래커 컨벤션이 지원하는 경우 리뷰어 이름에서 파생된 카테고리 레이블.
- **길이 제한:** 구성된 본문이 트래커의 길이 제한을 초과하는 경우, `... (continued in ce-code-review run artifact: /tmp/compound-engineering/ce-code-review/<run-id>/)`를 덧붙여 자르고, 본문과 메타데이터 블록 모두에 finding_id를 포함하여 아티팩트를 찾을 수 있게 하십시오.

finding_id는 `normalize(file) + line_bucket(line, +/-3) + normalize(title)`로 구성된 안정적인 지문(fingerprint)이며, 병합 파이프라인에서 사용되는 것과 동일합니다.

---

## 실패 경로 (Failure path)

실행 시 티켓 생성에 실패한 경우 (API 에러, 세션 도중 인증 만료, 속도 제한, 잘못된 본문 형식으로 인한 거절, 4xx/5xx 응답 등):

**대화형 모드:** 실패 내용을 인라인으로 노출하고 플랫폼의 차단형 질문 도구를 사용하여 사용자에게 질문하십시오.

질문 요지:
> Defer failed: <트래커 이름>이 <에러 요약>을 반환했습니다. 이 발견 사항을 어떻게 처리할까요?

옵션:
- `Retry on <tracker>` — 동일한 트래커에 한 번 더 시도합니다 (일시적인 에러 시 유용)
- `Fall back to next sink` — 이 발견 사항의 지연 조치를 폴백 체인의 다음 단계로 이동합니다 (예: Linear에서 GitHub Issues로)
- `Convert to Skip — record the failure` — 이 지연 조치를 포기하고, 완료 보고서의 실패 섹션에 기록한 뒤 워크스루나 대량 처리를 계속합니다.

**비대화형 모드:** 프롬프트를 띄우지 않습니다. 자동으로 다음 단계로 폴백합니다. 모든 단계가 실패하면 구조화된 결과의 `failed` 버킷에 발견 사항을 기록하고 계속합니다. 체인이 소진될 때까지 사용 가능한 저장소가 없으면 발견 사항은 `no_sink` 버킷에 담깁니다.

높은 신뢰도의 명명된 트래커가 실행 시 실패하면, 캐싱된 `named_sink_available`은 남은 세션 동안 `false`로 설정됩니다. 이후의 지연 조치들은 확인된 고장 저장소를 재시도하지 않고 바로 다음 단계로 폴백합니다. `any_sink_available`은 모든 단계가 고장난 것으로 확인되었을 때만 `false`로 변경됩니다 — Linear 호출은 실패했지만 `gh`를 통한 시도는 성공한다면 `any_sink_available = true`를 유지합니다.

`ToolSearch`가 일치하는 항목을 찾지 못하거나 도구 호출이 에러를 반환하는 경우 — 또는 차단형 질문 도구가 없는 플랫폼의 경우 — 에만 차선책으로 번호가 매겨진 옵션을 제시하고 사용자의 응답을 기다립니다 (대화형 모드 전용).

---

## 트래커별 세부 동작

실행 시 트래커별 구체적인 동작입니다. 에이전트는 환경에서 사용 가능한 인터페이스(MCP, CLI, 또는 API) 중 적절한 것을 선택하여 호출합니다.

| 트래커 | 인터페이스 | 호출 예시 | 본문 형식 | 레이블 |
|---------|-----------|-------------------|-------------|--------|
| Linear | MCP (권장) 또는 API | 문서에서 식별된 프로젝트/워크스페이스에 이슈 생성; MCP 도구가 사용자 컨텍스트를 제공하는 경우 보고자에게 할당 | Markdown | MCP가 노출하는 경우 심각도 우선순위 필드 사용; 그렇지 않으면 본문에 심각도 포함 |
| GitHub Issues | `gh issue create` | 기본 리포지토리는 현재 리포지토리입니다. 레이블이 존재하는 경우 `--label`로 심각도 태그를 추가하며, 레이블 고정 장치(fixture)가 없는 경우 생략합니다. 첫 실패 시 레이블 없는 이슈로 폴백합니다. | Markdown | `--label P0` / `--label P1` 등 (레이블 존재 시) |
| Jira | MCP 또는 API | 문서에서 식별된 프로젝트에 이슈 생성; Jira의 Markdown 문법이 GitHub와 다를 경우 MCP가 변환을 처리하지 않는 한 본문에 플레인 텍스트 사용 | MCP가 변환하지 않는 경우 플레인 텍스트 | 심각도 우선순위 필드 |
| 저장소 없음 | — | 대화형: 지연 옵션 제외, 발견 사항은 리포트의 잔여 작업 섹션에 유지. 비대화형: 호출자 라우팅을 위해 `no_sink` 버킷으로 반환. | — | — |

불확실한 경우, "조용히 넘어가고 잘 되길 바라는 것"보다 "명시적인 알림과 함께 중단"하는 쪽을 선택하십시오. 내구성 있는 아티팩트도 생성되지 않고 사용자 메시지도 없는 지연 조치는 데이터 손실과 같습니다.

---

## 크로스 플랫폼 유의 사항

질문 도구의 이름은 플랫폼마다 다릅니다. 대화형 모드에서는 플랫폼의 차단형 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하십시오. Claude Code의 경우 대화형 모드 사전 로드 단계에서 도구가 이미 로드되어 있어야 합니다 — 로드되지 않았다면 지금 `ToolSearch`를 `select:AskUserQuestion` 쿼리와 함께 호출하십시오. 하네스에 차단형 도구가 전혀 없는 경우(예: `request_user_input`이 없는 Codex 편집 모드 등)에만 차선책으로 채팅의 번호가 매겨진 옵션으로 폴백하십시오. 스키마 로드 대기 상태는 폴백 트리거가 아닙니다. 절대로 질문을 조용히 생략하지 마십시오.

비대화형 모드는 플랫폼 중립적입니다. 프롬프트를 띄우지 않으므로 플랫폼별 질문 도구와 무관합니다.
