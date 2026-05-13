# 트래커 감지 및 지연 실행 (Tracker Detection and Defer Execution)

이 레퍼런스는 Defer(지연) 작업이 프로젝트 트래커에 티켓을 생성하는 방법을 설명합니다. 이는 Interactive 모드의 라우팅 질문에서 옵션 C(티켓 생성 - File tickets)를 제안할지 결정할 때, 워크스루의 Defer 옵션이 실행될 때, 그리고 옵션 C의 일괄 미리보기가 표시될 때 `SKILL.md`에 의해 로드됩니다. 또한 `lfg`와 같이 사용자 프롬프트 없이 잔존 실행 가능 발견 사항을 티켓으로 생성해야 하는 자율 호출자(autonomous callers)에 의해서도 로드됩니다. -- 아래 실행 모드 섹션을 참조하십시오.

---

## 실행 모드 (Execution Modes)

Tracker-defer에는 두 가지 실행 모드가 있습니다. 호출자가 하나를 선택하며, 감지, 폴백 체인 및 티켓 구성은 공유됩니다.

### Interactive 모드 (기본값)

`ce-code-review` Interactive 모드의 라우팅 질문, 워크스루 Defer 작업 및 일괄 미리보기 옵션 C에서 사용됩니다. 모든 사용자 대면 프롬프트가 실행됩니다:

- 세션의 첫 번째 Defer 작업 시 일반적인(이름이 없는) 레이블이 있는 경우 유효한 트래커 선택을 확인합니다.
- 실행 실패 시 Retry / Fall back to next sink / Convert to Skip 프롬프트를 표시합니다.
- 라우팅 질문의 레이블은 `named_sink_available`(트래커 이름 지정) 대 폴백 일반 명칭을 반영합니다.

### Non-interactive 모드 (비대화형 모드)

프롬프트를 표시하지 않아야 하는 `lfg`와 같은 자율 호출자에서 사용됩니다. 모든 차단 질문은 건너뛰며, 폴백 체인이 순서대로 조용히 실행됩니다. 동작 방식:

- 첫 번째 일반 레이블 Defer 시 확인 단계를 거치지 않고 즉시 진행합니다.
- 실행 실패 시 프롬프트 없이 자동으로 다음 티어로 넘어갑니다. 실패 내용을 기록합니다.
- 체인이 완전히 소진된 경우(모든 티어가 실패하거나 사용 가능한 sink가 없음), 호출자가 다른 표면(예: PR 설명에 인라인으로 포함)으로 라우팅할 수 있도록 발견 사항을 `no_sink` 버킷에 넣어 반환합니다.
- 구조화된 결과를 반환합니다: `{ filed: [{ finding_id, tracker, url }], failed: [{ finding_id, tracker, reason }], no_sink: [{ finding_id, title, severity, file, line }] }`.

호출자는 결과를 사용자에게 표시하는 방법을 결정합니다. 비대화형 모드는 "사용 가능한 sink 없음"을 프롬프트 트리거가 아닌 데이터 생성 결과로 취급합니다.

---

## 감지 (Detection)

에이전트는 명백한 문서를 통해 프로젝트의 트래커를 결정합니다. 주요 소스: 레포 루트 및 관련 하위 디렉토리의 `CLAUDE.md` 및 `AGENTS.md`. 주요 문서가 모호한 경우의 보조 신호: `CONTRIBUTING.md`, `README.md`, `.github/` 아래의 PR 템플릿, 레포에서 확인 가능한 트래커 URL.

트래커는 MCP 도구(예: Linear MCP 서버), CLI(예: `gh`), 또는 직접 API를 통해 노출될 수 있습니다. 모두 허용됩니다. 감지 출력은 두 개의 가용성 플래그를 포함하는 튜플입니다 — 하나는 지정된 트래커 전용(Interactive 모드에서 레이블 신뢰도 결정)이고, 다른 하나는 전체 폴백 체인용(Defer 제공 여부 결정)입니다:

```
{ tracker_name, confidence, named_sink_available, any_sink_available }
```

여기서:
- `tracker_name` — 사람이 읽을 수 있는 이름 ("Linear", "GitHub Issues", "Jira"), 또는 감지할 수 없는 경우 `null`
- `confidence` — 트래커가 문서에 명시적으로 명명되어 있고(또는 특정 프로젝트/워크스페이스에 대한 링크가 있고) 의심의 여지 없이 프로젝트의 공식 트래커인 경우 `high`, 신호가 부족하거나 상충하거나 암시만 된 경우 `low`
- `named_sink_available` — 에이전트가 실제로 감지된 트래커를 호출할 수 있는 경우(MCP 도구가 로드됨, CLI가 인증됨, 또는 API 자격 증명이 환경 변수에 있음) `true`, 트래커가 문서화되어 있지만 도달할 도구가 없거나 트래커를 찾지 못한 경우 `false`. 인라인 트래커 이름 지정은 이 값이 `true`여야 합니다.
- `any_sink_available` — 이번 세션에서 폴백 체인의 어떤 티어(지정된 트래커 또는 `gh`를 통한 GitHub Issues)라도 호출할 수 있는 경우 `true`. Interactive 모드에서 Defer 제안 여부와 비대화형 모드에서 `no_sink` 버킷 사용 여부를 결정합니다.

감지는 추론 기반입니다. 읽어야 할 파일의 나열된 체크리스트를 유지하지 마십시오. 명백한 소스를 읽고 확신 있는 결론을 내리십시오. 명백한 소스로 해결되지 않으면 레이블은 일반적인 문구로 폴백하며 에이전트는 실행 전 사용자에게 확인을 받습니다(Interactive 모드만 해당).

---

## 프로브 타이밍 및 캐싱 (Probe timing and caching)

가용성 프로브(Availability probes)는 **세션당 최대 한 번**, 그리고 **Defer 실행이 임박했을 때만** 실행됩니다. 리뷰 시작 시 추측성으로 실행하거나 Defer별, 워크스루 발견 사항별로 실행하지 않습니다. 캐시된 튜플은 동일한 실행 내의 모든 Defer 작업에서 재사용됩니다.

전형적인 프로브 시퀀스:

1. `CLAUDE.md` / `AGENTS.md`에서 트래커 참조를 읽습니다. 발견되지 않으면 `tracker_name = null`, `confidence = low`로 설정합니다.
2. **지정된 트래커가 발견된 경우 이를 프로브합니다.** GitHub Issues의 경우 `gh auth status` 및 `gh repo view --json hasIssuesEnabled`를 실행합니다. Linear 또는 다른 MCP 기반 트래커의 경우 관련 MCP 도구가 로드되어 있고 응답하는지 확인합니다. API 기반 트래커의 경우 환경의 자격 증명을 확인합니다. 프로브 결과에 따라 `named_sink_available`을 설정합니다.
3. **`any_sink_available` 계산을 위해 GitHub Issues 폴백을 프로브합니다.** 지정된 트래커를 찾아 프로브한 경우에도, 문서화된 트래커가 없지만 `gh`가 작동하는 경우 Defer를 제안할 수 있도록 `any_sink_available` 결정에 `gh`가 중요합니다.
   - `named_sink_available = true`인 경우: `any_sink_available = true` (추가 프로브 불필요).
   - 그렇지 않은 경우, `gh auth status` + `gh repo view --json hasIssuesEnabled`를 통해 GitHub Issues를 프로브합니다(2단계에서 이미 수행한 경우 건너뜀). 작동하면 `any_sink_available = true`.
   - 그렇지 않으면 `any_sink_available = false`.

Interactive 모드의 라우팅 질문을 완전히 건너뛰는 경우(R2 발견 사항 0개 케이스), 프로브는 실행되지 않습니다. 세션 전체에서 캐시된 튜플이 재사용될 때, 세션의 첫 번째 프로브에서 얻은 `named_sink_available = true`는 캐시된 상태로 유지됩니다 — Defer마다 다시 프로브하지 마십시오.

---

## 레이블 로직 (Interactive 모드)

- `confidence = high` 이고 `named_sink_available = true`인 경우: 라우팅 질문의 옵션 C와 워크스루의 발견 사항별 Defer 옵션 모두에 트래커 이름을 그대로 포함합니다. 예: `File a Linear ticket per finding`, `Defer — file a Linear ticket`.
- `any_sink_available = true`이지만 `confidence = low` 또는 `named_sink_available = false`인 경우(폴백 티어가 대신 작동 중): 레이블은 일반적인 형태(`File an issue per finding`, `Defer — file a ticket`)로 표시됩니다. 세션의 첫 번째 Defer를 실행하기 전, 에이전트는 플랫폼의 차단 질문 도구를 사용하여 유효한 트래커 선택을 사용자에게 확인받습니다.
- `any_sink_available = false`인 경우: 라우팅 질문에서 옵션 C가 제외되고, 워크스루의 발견 사항별 옵션에서 Defer 옵션이 제외됩니다. 에이전트는 라우팅 질문의 줄기(stem) 부분에서 사용자에게 왜 그런지 설명합니다.

비대화형 모드는 레이블 결정을 건너뛰고 감지된 sink에 대해 조용히 작업을 수행합니다.

---

## 폴백 체인 (Fallback chain)

지정된 트래커를 사용할 수 없거나 지정된 트래커가 없는 경우 다음 순서로 폴백합니다. 프로젝트의 감지된 트래커를 선호하며, 지정된 트래커를 찾지 못했거나 도달할 수 없는 경우에만 `gh`를 사용합니다.

1. **지정된 트래커 (Named tracker)** (에이전트가 직접 호출할 수 있는 MCP 도구, CLI 또는 API - 위의 감지 섹션 참조)
2. **`gh`를 통한 GitHub Issues** — `gh auth status`가 성공하고 현재 레포에 이슈가 활성화된 경우 (`gh repo view --json hasIssuesEnabled`가 `true`를 반환)
3. **Sink 없음 (No sink)** — 발견 사항은 리뷰 보고서의 잔존 작업 섹션에 남거나(Interactive 모드), 호출자가 라우팅할 수 있도록 `no_sink` 버킷으로 반환됩니다(Non-interactive 모드). 에이전트는 이를 일시적인 표면을 통해 다시 표시하지 않습니다.

이전에 이 체인에는 세 번째 세션 내 폴백 티어가 포함되어 있었습니다. 해당 티어는 세션이 종료되면 사라지기 때문에 Defer 작업의 의도인 "영구적 기록"에 부합하지 않아 제거되었습니다. 영구 트래커가 없는 경우, 발견 사항을 보고서에 남기거나(Interactive) 호출자에게 반환하는 것(Non-interactive)이 올바른 동작입니다.

---

## 티켓 구성 (Ticket composition)

모든 Defer 작업은 트래커의 기능에 맞춰 다음 내용을 포함하는 티켓을 생성합니다:

- **제목:** 병합된 발견 사항의 `title` (스키마에 의해 10단어로 제한됨).
- **본문:**
  - 평이한 영어 문제 진술 — `/tmp/compound-engineering/ce-code-review/<run-id>/{reviewer}.json`에 있는 해당 리뷰어의 아티팩트 파일에서 페르소나가 생성한 `why_it_matters`를 읽어옵니다. 이때 headless 모드에서 사용하는 것과 동일한 `file + line_bucket(line, +/-3) + normalize(title)` 매칭 방식을 사용합니다(SKILL.md Stage 6 상세 강화 내용 참조). 아티팩트 매칭이 불가능한 경우 병합된 발견 사항의 `title`, `severity`, `file` 및 (존재하는 경우) `suggested_fix`를 대신 사용합니다. 이 필드들은 병합 티어의 컴팩트 반환값에 보장됩니다.
  - 제안된 수정 사항 (발견 사항의 `suggested_fix`가 있는 경우).
  - 증거 (리뷰어 아티팩트에서의 직접 인용).
  - 메타데이터 블록: `Severity: <level>`, `Confidence: <score>`, `Reviewer(s): <list>`, `Finding ID: <fingerprint>`.
- **레이블** (트래커가 레이블을 지원하는 경우): 심각도 태그(`P0`, `P1`, `P2`, `P3`) 및 트래커 컨벤션이 지원하는 경우 리뷰어 이름에서 가져온 카테고리 레이블.
- **길이 제한:** 구성된 본문이 트래커의 본문 길이 제한을 초과하는 경우, `... (continued in ce-code-review run artifact: /tmp/compound-engineering/ce-code-review/<run-id>/)`로 자르고 본문 하단과 메타데이터 블록에 `finding_id`를 포함하여 아티팩트를 찾을 수 있게 합니다.

`finding_id`는 병합 파이프라인에서 사용되는 것과 동일한 `normalize(file) + line_bucket(line, +/-3) + normalize(title)` 형식의 안정적인 지문(fingerprint)입니다.

---

## 실패 경로 (Failure path)

실행 시 티켓 생성에 실패한 경우(API 오류, 세션 중 인증 만료, 속도 제한, 잘못된 본문 형식 거부, 4xx/5xx 응답):

**Interactive 모드:** 실패를 인라인으로 표시하고 플랫폼의 차단 질문 도구를 사용하여 사용자에게 질문합니다.

질문 문구:
> Defer failed: <tracker name> returned <error summary>. How should the agent handle this finding?

옵션:
- `Retry on <tracker>` — 동일한 트래커에 한 번 더 시도합니다 (일시적인 오류에 유용)
- `Fall back to next sink` — 이 발견 사항의 Defer를 폴백 체인의 다음 티어로 이동합니다 (예: Linear에서 GitHub Issues로)
- `Convert to Skip — record the failure` — 이 Defer 작업을 포기하고, 완료 보고서의 실패 섹션에 실패를 기록한 뒤 워크스루나 일괄 흐름을 계속 진행합니다.

**Non-interactive 모드:** 프롬프트를 표시하지 않습니다. 자동으로 다음 티어로 넘어갑니다. 모든 티어가 실패하면 구조화된 반환값의 `failed` 버킷에 해당 발견 사항을 기록하고 계속 진행합니다. 체인이 소진되어 sink를 사용할 수 없게 되면 발견 사항은 `no_sink` 버킷에 담깁니다.

높은 신뢰도의 지정된 트래커가 실행 시 실패하면, 세션의 남은 시간 동안 캐시된 `named_sink_available`은 `false`로 설정됩니다. 이후의 Defer 작업은 고장 난 것으로 확인된 sink를 재시도하지 않고 바로 다음 티어로 넘어갑니다. `any_sink_available`은 모든 티어가 고장 난 것으로 확인되었을 때만 `false`로 강등됩니다 — Linear 호출은 실패했지만 `gh`를 통한 호출에 성공했다면 `any_sink_available = true`가 유지됩니다.

`ToolSearch`가 명시적으로 매치를 반환하지 않거나 도구 호출 오류가 발생하는 경우, 또는 차단 질문 도구가 없는 플랫폼에서만 번호가 매겨진 옵션을 제시하고 사용자의 응답을 기다리는 방식으로 폴백합니다(Interactive 모드만 해당).

---

## 트래커별 동작 (Per-tracker behavior)

실행 시 각 트래커별 구체적인 동작입니다. 에이전트는 적절한 인터페이스(MCP, CLI 또는 API)를 통해 이들 중 하나를 호출할 수 있으며, 선택은 현재 환경에서 사용 가능한 것에 따라 달라집니다.

| 트래커 | 인터페이스 | 호출 개요 | 본문 형식 | 레이블 |
|---------|-----------|-------------------|-------------|--------|
| Linear | MCP (권장) 또는 API | 문서에서 확인된 프로젝트/워크스페이스에 이슈 생성. MCP 도구가 사용자 컨텍스트를 제공하는 경우 보고자(reporter)를 할당함. | 마크다운 | MCP가 노출하는 경우 심각도 우선순위 필드 사용, 그렇지 않으면 본문에 심각도 포함 |
| GitHub Issues | `gh issue create` | 기본값은 현재 레포. 레이블 픽스처가 있는 경우 심각도 태그를 위해 `--label` 사용. 첫 번째 실패 시 레이블 없는 이슈로 폴백. | 마크다운 | 레이블이 있는 경우 `--label P0` / `--label P1` 등 |
| Jira | MCP 또는 API | 문서에서 확인된 프로젝트에 이슈 생성. Jira의 마크다운 방언은 GitHub와 다르므로 MCP가 변환을 처리하지 못하는 경우 본문에 일반 텍스트 사용. | MCP가 마크다운을 처리하지 못할 경우 일반 텍스트 | 심각도 우선순위 필드 |
| No sink available | — | Interactive: Defer 옵션 생략, 발견 사항은 보고서의 잔존 작업 섹션에 남음. Non-interactive: 발견 사항이 호출자 라우팅을 위해 `no_sink` 버킷으로 반환됨. | — | — |

불확실할 때는 "조용히 무시하고 넘어가기"보다 "사용자 대면 공지와 함께 중단하기"를 선호하십시오. 영구적인 아티팩트도 생성하지 않고 사용자 메시지도 없는 Defer 작업은 데이터 손실입니다.

---

## 크로스 플랫폼 참고 사항

질문 도구의 이름은 플랫폼마다 다릅니다. Interactive 모드에서는 플랫폼의 차단 질문 도구(Claude Code의 `AskUserQuestion`, Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user` (pi-ask-user 확장 필요))를 사용하십시오. Claude Code에서는 `SKILL.md`의 Interactive 모드 프리로드 단계에서 도구가 이미 로드되어 있어야 합니다. 로드되지 않은 경우 지금 `select:AskUserQuestion` 쿼리로 `ToolSearch`를 호출하십시오. 하네스에 차단 도구가 실제로 없는 경우에만 채팅에서 번호가 매겨진 옵션으로 폴백하십시오. 스키마 로드 대기는 폴백 트리거가 아닙니다. 질문을 무시하고 넘어가서는 안 됩니다.

비대화형 모드는 플랫폼에 무관합니다. 프롬프트를 표시하지 않으므로 플랫폼의 질문 도구가 관련이 없습니다.
