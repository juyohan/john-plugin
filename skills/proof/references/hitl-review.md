# HITL 리뷰 모드 (HITL Review Mode)

Proof를 통해 공유된 Markdown 문서에 대한 Human-in-the-loop(HITL) 반복 루프입니다. 상위 스킬(`ce-brainstorm`, `ce-ideate`, `ce-plan`)이 생성한 초안을 전달하거나, 사용자가 디스크에 이미 있는 Markdown 파일에 대해 반복 작업을 요청할 때("share this to proof and iterate", "HITL this doc with me") 호출됩니다. 두 경우 모두 로컬 문서를 업로드하고, 사용자가 Proof의 웹 UI에서 주석을 달게 한 뒤, 피드백을 스레드 답글 및 추적된 편집 사항으로 수집하고, 최종 문서를 다시 디스크에 동기화하는 동일한 메커니즘을 사용합니다.

이 모드는 로컬 Markdown 파일이 존재한다고 가정합니다. "처음부터 생성"하는 경로는 없습니다 — 사용자가 새 문서를 원하면 먼저 일반적인 Proof 생성 워크플로우로 생성한 다음 HITL을 호출하십시오.

상위 호출자 또는 사용자가 직접 HITL 리뷰 모드를 요청할 때 이 파일을 로드하십시오.

---

## 호출 규약 (Invocation Contract)

입력값:

- **소스 파일 경로 (Source file path)** (필수): 로컬 Markdown 파일의 절대 경로 또는 리포지토리 상대 경로입니다. 상위 호출자가 이 모드를 호출할 때 경로를 명시적으로 전달합니다. 사용자가 직접 호출하는 경우("share that doc to proof and let's iterate") 대화 컨텍스트(사용자가 방금 참조, 생성 또는 편집한 파일)에서 경로를 도출하십시오. 모호한 경우 사용자에게 어떤 파일인지 물어보십시오.
- **문서 제목 (Doc title)** (필수): Proof 문서의 표시 제목입니다. 상위 호출자가 이를 명시적으로 전달하며, 사용자가 직접 호출하는 경우 파일의 H1 제목을 기본값으로 사용하고, H1이 없으면 파일 이름(확장자 제외)을 사용합니다.
- **권장 다음 단계 (Recommended next step)** (선택 사항, 호출자 전용): 호출자가 최종 터미널 출력에 표시되길 원하는 짧은 문자열입니다 (예: "Recommended next: `/ce-plan`"). 사용자가 직접 호출하는 경우에는 사용되지 않으며, 터미널 보고서는 단순히 반복 작업을 요약하고 다음 단계를 묻습니다.

에이전트 ID는 고정되어 있으며 매개변수가 아닙니다. 모든 API 호출은 에이전트 ID `ai:compound-engineering`과 표시 이름 `Compound Engineering`을 사용합니다. 호출자는 이를 오버라이드할 수 없습니다.

반환 형태 (상위 호출자가 전달 작업을 재개할 때 사용하며, 직접 호출된 경우 터미널에서 사용자에게도 표시됨):

- `status`: `proceeded` | `done_for_now` | `aborted`
- `localPath`: 소스 파일 경로 (입력값과 동일)
- `localSynced`: 리뷰된 문서가 Phase 5에서 `localPath`에 다시 작성된 경우 `true`, 사용자가 동기화를 거부하여 로컬 파일이 이전 버전인 경우 `false`입니다. `proceeded`인 경우에만 존재합니다.
- `docUrl`: Proof 문서의 tokenUrl
- `openThreadCount`: 문서 내 해결되지 않은 스레드 수
- `revision`: 최종 동기화 후의 최종 문서 리비전 (`proceeded`인 경우에만 해당)

---

## Phase 1: 업로드 및 대기 (Upload and Wait)

1. 로컬 Markdown 파일을 메모리로 읽어옵니다. 이 내용을 `uploadedMarkdown`으로 기억하십시오 — Phase 5에서 이와 비교하여 세션 중에 변경 사항이 있었는지 감지합니다.
2. `POST https://www.proofeditor.ai/share/markdown`을 `{title, markdown}`과 함께 호출하여 `slug`, `accessToken`, `tokenUrl`을 캡처합니다.
3. `POST /api/agent/{slug}/presence`를 `X-Agent-Id: ai:compound-engineering`, `x-share-token: <token>` 헤더 및 본문 `{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc for review"}`와 함께 호출합니다.
4. 터미널에 눈에 띄게 표시하십시오:

   ```
   Doc ready for review: <tokenUrl>
   ```

5. 플랫폼의 차단형 질문 도구(Claude Code의 `AskUserQuestion` (스키마가 로드되지 않은 경우 먼저 `ToolSearch select:AskUserQuestion` 호출), Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 사용자에게 질문하십시오. 하네스에 차단 도구가 없거나 호출 에러(예: Codex 편집 모드)가 발생하는 경우에만 차선책으로 채팅에 옵션을 제시하십시오. 스키마 로드가 필요하다는 이유로 질문을 자동으로 건너뛰지 마십시오. 절대로 질문을 조용히 생략하지 마십시오.

   **질문:** "Proof에서 텍스트를 강조하여 의견을 남겨주세요. 에이전트가 각 의견을 읽고 스레드에서 답장하거나 수정 사항을 적용한 뒤, 변경 사항을 로컬 파일로 다시 동기화합니다. 다음은 무엇을 할까요?"

   **옵션:**
   - **피드백 완료 — 읽고 적용하기 (I'm done with feedback — read it and apply)**
   - **피드백 없음 — 진행하기 (I have no feedback — proceed)**

   사용자가 아직 리뷰 중이라면 프롬프트를 열어둔 채 대기하게 됩니다. 차단형 질문은 자연스럽게 대기 상태를 유지합니다.

   **피드백 없음 — 진행하기** 선택 시: Phase 5(최종 동기화)로 건너뛰고, `status: proceeded`와 함께 호출자에게 반환합니다.

   **피드백 완료 — 읽고 적용하기** 선택 시: Phase 2를 계속합니다.

---

## Phase 2: 수집 패스 (Ingest Pass)

현재 문서 상태에 대한 단일 패스입니다. 결정론적이고 멱등적(idempotent)이며 마크(marks)로부터 도출됩니다 — 세션 캐시나 사이드카 상태는 없습니다.

패스 시작 시 상태(presence)를 `status: "acting"` 및 `"Reading your feedback"`과 같은 짧은 요약으로 업데이트하여, Proof 탭을 보고 있는 사용자에게 에이전트가 코멘트에 대해 작업 중임을 알리십시오. Phase 3 터미널 보고서 전에는 `status: "waiting"`으로 업데이트하여, 터미널이 다음 신호를 기다리는 동안 탭에서 "사용자 차례"임을 신호하도록 하십시오. Phase 1과 동일한 `POST /presence` 호출을 사용하며 `status`/`summary`만 다릅니다.

### 2.1 최신 상태 읽기

```
GET /api/agent/{slug}/state
Headers: x-share-token: <token>
```

다음 항목을 캡처하십시오:
- `markdown` (현재 본문 — 사용자의 직접 편집 및 수락된 제안 사항 포함)
- `revision`
- `marks` (markId로 키잉된 객체)
- `mutationBase.token` — 이번 라운드의 뮤테이션(mutations)에 필요한 baseToken

### 2.2 주의가 필요한 마크 식별

`marks` 중 다음 조건이 **모두** 충족되는 항목을 필터링하십시오:

- `by`가 `human:`으로 시작함 (에이전트가 아닌 사람이 작성함)
- `resolved`가 `false`임
- `thread`에 `ai:*` ID로 작성된 항목이 없거나, **또는** `thread`의 가장 최신 항목이 `human:*`에 의해 작성되었고 `at` 타임스탬프가 최신 `ai:*` 항목보다 나중임 (사용자가 이전 에이전트 답글에 응답함)

그 외의 항목은 모두 건너뜁니다. 에이전트가 작성한 마크, 해결된 스레드, 그리고 새로운 사람의 응답 없이 이미 답장이 완료된 스레드는 완료된 것으로 간주합니다.

### 2.3 각 마크를 읽고 응답 결정

HITL의 목적은 모든 결정을 터미널로 끌어들이지 않고 사용자가 Proof에서 자연스럽게 문서를 조정할 수 있게 하는 것입니다. 대부분의 피드백은 자동으로 적용될 수 있습니다. 에이전트가 독자적으로 확신 있는 판단을 내릴 수 없는 경우에만 에스컬레이션하십시오.

실제 피드백은 여러 유형이 섞여 있습니다 — "이것은 틀렸으니 Y로 이름을 바꾸세요"는 이의 제기인 동시에 지시입니다. "왜 X인가요? Z가 더 좋겠어요"는 질문인 동시에 제안입니다. 깔끔한 분류를 강요하지 마십시오. 코멘트 텍스트, 앵커된 `quote`, 그리고 이전 스레드 답글을 읽고 다음과 같이 결정하십시오:

**에이전트가 확신을 가지고 직접 수정을 적용할 수 있는가?** 명령형 문장("X를 Y로 변경", "이것 삭제", "Z에 대한 섹션 추가")은 보통 이에 해당합니다. 편집을 적용하고, 무엇이 변경되었는지 한 줄 요약으로 답글을 남긴 뒤 해결(resolve)하십시오.

**명확한 답이 있는 질문인가?** 스레드에서 답변하십시오. 답변만으로 충분하다면 해결하십시오. 답변으로 인해 사용자가 고려해야 할 새로운 결정 사항이 생기면 스레드를 열어둔 채 터미널 보고서에 노출하십시오.

**이의 제기인가?** ("이것은 틀렸음", "§2와 모순됨", "작동하지 않을 것임"). 현재 내용에 대해 주장을 평가하십시오. 에이전트가 동의하면 수정하고 "동의합니다 — X로 업데이트했습니다"라고 답글을 남기십시오. 에이전트가 동의하지 않으면 이유와 함께 답글을 남기고 스레드를 열어두십시오. 평가 없이 이의 제기를 무조건 적용하지 마십시오 — 사용자가 계획이 잘못되었다고 생각하기 때문에 플래그를 남긴 것이 핵심입니다.

**의도가 정말로 불분명한가?** 우선 가장 합리적인 해석을 시도하여 적용하고, "X로 이해하여 적용했습니다 — 되돌려야 한다면 알려주세요"라고 답글을 남기십시오. 리스크가 낮을 때는 이것이 왕복 소통보다 효율적입니다. 해석에 따라 결과가 크게 달라질 때만 명확한 설명을 요청하십시오. 요청 시에는 선택지가 명확할 경우 플랫폼의 차단형 질문 도구를 사용하여 빠른 객관식 질문을 던지거나, 자유로운 응답이 더 자연스러울 때는 스레드 코멘트로 남기십시오. 어느 쪽이든 스레드를 열어두어 다음 패스에서 사용자의 응답을 수집할 수 있게 하십시오.

**불변 법칙:** 주의가 필요한 모든 마크는 패스 종료 시 스레드에 에이전트의 답글이 남아야 합니다. 답글이 없으면 "여전히 처리 중"으로 간주되어 다음 패스에서 다시 분류됩니다. 이것이 사이드카 없이도 루프를 멱등적으로 만드는 원리입니다. 마크 상태가 곧 상태입니다. 에이전트가 동의하지 않거나 결정할 수 없는 경우에도 조용히 건너뛰지 말고 이유나 질문을 답글로 남기십시오.

**독립적인 스레드 작업 병렬화.** 서로 다른 마크에 대한 `comment.reply` 및 `comment.resolve`는 충돌하지 않습니다 — 서로 다른 스레드 상태를 건드리며, 하나의 오래된 `baseToken`이 다른 항목에 영향을 주지 않습니다 (retry-on-`STALE_BASE`는 저렴하며 마크별로 로컬하게 수행됨). 일반적인 답글이나 해결로 분류된 주의 필요 마크가 3개 이상인 경우, 한 턴에 여러 도구 호출을 사용하거나 하위 에이전트(Claude Code의 `Agent`/`Task`, Codex의 `spawn_agent`, Pi의 `subagent`)를 통해 병렬로 처리하십시오. 블록을 변경하는 편집(`suggestion.add`, `/edit/v2`)은 순차적으로 처리하거나 하나의 `/edit/v2` 호출로 묶으십시오 — 병렬 블록 편집은 서로의 `baseToken`을 무효화하여 재시도를 강제할 수 있으며, 순서대로 처리하는 것이 동작을 추론하기 더 쉽습니다.

### 2.4 편집 적용

사용자는 문서에서 협업 중이며 승인을 기다리고 있는 것이 아닙니다. 모든 뮤테이션은 라이브 클라이언트로 작동합니다 — 문서 전체를 대상으로 하는 `rewrite.apply`만 게이트로 보호됩니다. 의도에 맞는 도구를 선택하십시오:

**기본값: `status: "accepted"`와 함께 `suggestion.add` 사용** 인용구(quote)에 앵커된 내용 변경(단어 수정, 이름 변경, 명확화, 교정, 인라인 문장 추가)에 사용합니다. 한 번의 호출로 추적된 제안 마크를 생성하고 변경 사항을 커밋합니다. 사용자는 커밋된 텍스트를 보게 되며(승인 대기 불필요), 마크는 편집별 속성(attribution)과 한 번의 클릭으로 되돌릴 수 있는 기록(audit trail)으로 남습니다. 이것은 HITL에서 자동으로 적용되는 편집에 가장 적합한 기본 방식(primitive)입니다 — 사용자에게 재검토를 요구하지 않으면서도 되돌릴 수 있는 기록을 제공합니다.

```json
{"type":"suggestion.add","kind":"replace","quote":"<anchor>","content":"<new>","by":"ai:compound-engineering","status":"accepted","baseToken":"<token>"}
```

상황에 따라 `kind: "insert" | "delete" | "replace"`를 사용하십시오. 세 종류 모두 `status: "accepted"`를 지원합니다.

**기록이 잘못되었거나 기술적으로 차단된 경우에만 조용히 `/edit/v2` 사용:**

- **원자성(Atomicity)이 필요한 경우** — 여러 조정된 편집이 함께 커밋되어야 하는 경우 (예: 새 섹션 삽입 + 다른 블록의 참조 업데이트 + 쓸모없어진 단락 삭제). `/edit/v2`는 원자적으로 커밋되는 `operations` 배열을 받습니다. 개별 `suggestion.add` 호출은 부분적으로만 성공할 수 있습니다.
- **사용자 확인 전 자기 수정** — 사용자가 문서를 보기 전에 에이전트가 자신의 출력을 수정하는 경우 (예: 수집 패스 도중 실수를 발견함). 추적된 마크를 남기면 사용자 입장에서는 오해의 소지가 있는 "이전 버전"이 존재했다는 의미가 됩니다.
- **인용 앵커가 없는 순수 구조적 삽입** — 기존 텍스트를 앵커로 삼을 수 없는 완전히 새로운 블록/섹션을 추가하는 경우. `suggestion.add`는 `quote`가 필요하지만, `/edit/v2`는 블록 `ref`를 기준으로 `insert_before` / `insert_after`를 사용할 수 있습니다.
- **구조적 리스트 항목 또는 블록 제거** — `kind: "delete"`와 함께 `suggestion.add`를 사용하면 리스트 항목 내부의 텍스트만 삭제되고 불렛 마커(`*`, `-`, 또는 숫자 `1.`)는 고아 라인으로 남습니다. `/edit/v2 delete_block`을 사용하여 블록 전체를 제거하거나, `find_replace_in_block`을 사용하여 항목과 주변 공백을 깔끔하게 잘라내십시오.

```bash
# 블록 ref 및 baseToken 확인을 위한 snapshot 가져오기
curl -s "https://www.proofeditor.ai/api/agent/{slug}/snapshot" -H "x-share-token: <token>"
# 적용
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" -H "Idempotency-Key: <uuid>" \
  -d '{"by":"ai:compound-engineering","baseToken":"<token>","operations":[...]}'
```

작업별 본문 형태 (`replace_block`은 단일 `block`, 내용을 추가할 수 있는 모든 작업은 `blocks:[{markdown},...]` 배열 사용. 잘못된 형태는 서버에서 422 에러를 반환함):

```json
{"op":"replace_block","ref":"b8","block":{"markdown":"new content"}}
{"op":"insert_after","ref":"b3","blocks":[{"markdown":"new block"}]}
{"op":"insert_before","ref":"b3","blocks":[{"markdown":"new block"}]}
{"op":"delete_block","ref":"b6"}
{"op":"find_replace_in_block","ref":"b4","find":"old","replace":"new","occurrence":"first"}
{"op":"replace_range","fromRef":"b2","toRef":"b5","blocks":[{"markdown":"..."}]}
```

블록 `ref` 값은 리비전이 바뀌면 변경됩니다 — 마지막 스냅샷 이후 쓰기 작업이 있었다면 매 `/edit/v2` 호출 전에 최신 ref를 위해 `/snapshot`을 다시 호출하십시오.

**대량의 기계적 수정 — N번의 `suggestion.add`보다 한 번의 `/edit/v2` 호출을 권장합니다.** 동일한 변경 사항이 5개 이상의 블록에 영향을 주는 경우(문장 부호 교정, 용어 일괄 변경, 제목 스타일 표준화), 많은 `operations`를 포함한 단일 `/edit/v2` 호출로 배치 처리하십시오. 한 번의 네트워크 왕복, 한 번의 원자적 커밋, 하나의 감사 기록으로 끝납니다. 반면 N번의 개별 호출은 N번의 baseToken 읽기(아래 캐싱 미적용 시)와 하나의 논리적 변경에 대해 N개의 추적 마크를 남깁니다. 각 편집이 독립적이고 앵커가 중요한 경우(각각 개별적으로 되돌릴 가치가 있는 경우)에는 `suggestion.add` + `accepted`를 사용하고, 동일한 기계적 규칙의 변형인 경우에는 `/edit/v2` 배치를 사용하십시오.

**대기 중인 `suggestion.add` (상태 없음)는 판단이 예민하여 커밋 전 명시적인 사용자 승인을 원하는 경우에 사용합니다.** HITL에서는 자동으로 적용되는 편집이 왕복 시간을 줄이는 목적이므로 드물게 사용됩니다. 판단이 예민한 대부분의 경우는 스레드를 열어두고 명확한 질문을 던지는 것이 더 낫습니다.

**`rewrite.apply`는 라이브 리뷰 중에는 필요하지 않습니다.** 어차피 `LIVE_CLIENTS_PRESENT`에 의해 차단됩니다.

**뮤테이션 요구 사항 (답글 및 해결을 포함한 모든 쓰기 작업):**

- 최상위 필드는 `/ops`에서는 `type`, `/edit/v2`에서는 `operations[].op`입니다. 혼용하지 마십시오.
- `/state.mutationBase.token` (또는 `/edit/v2`의 경우 `/snapshot.mutationBase.token`)에서 가져온 `baseToken`을 포함하십시오.
- `by: "ai:compound-engineering"` 및 `X-Agent-Id: ai:compound-engineering` 헤더를 설정하십시오.
- `Idempotency-Key` 헤더(논리적 쓰기당 새로운 UUID)를 포함하십시오. 동일한 페이로드를 재시도할 때는 동일한 키를 재사용하고, 새로운 논리적 쓰기에는 새 키를 사용하십시오.
- 답글: `{"type":"comment.reply","markId":"<id>","by":"ai:compound-engineering","text":"..."}`. 해결: `{"type":"comment.resolve","markId":"<id>","by":"ai:compound-engineering"}`. 필요 시 다시 열기: `{"type":"comment.unresolve", ...}`.

**에러 발생 시 재시도는 재시도 전 검증(verify-first) 원칙을 따릅니다.** Proof API는 커밋에 성공하고도 2xx가 아닌 에러를 반환하거나 `collab.status: "pending"`인 202를 반환할 수 있으며, 서버가 이미 쓴 뒤에 네트워크 타임아웃이 발생할 수도 있습니다. 검증 없이 재시도하는 것은 동일한 마크가 중복 생성되는 가장 흔한 원인입니다.

- `STALE_BASE` / `BASE_TOKEN_REQUIRED` / `MISSING_BASE` / `INVALID_BASE_TOKEN` 발생 시: 커밋 전 토큰 관련 에러입니다. `/state`를 다시 읽고 최신 `baseToken`과 함께 동일한 페이로드를 전송하십시오. 아래의 `mutate()` 헬퍼는 이를 자동으로 재시도합니다.
- `ANCHOR_NOT_FOUND` / `ANCHOR_AMBIGUOUS` 발생 시: 커밋 전이지만 `quote`가 더 이상 고유하게 일치하지 않습니다. 다시 읽는 것만으로는 부족하며, 재시도 전 호출자가 앵커를 좁히거나 다시 생성해야 합니다. 헬퍼는 자동 재시도 대신 에러를 노출합니다.
- `INVALID_OPERATIONS` / `INVALID_REQUEST` / `INVALID_REF` / `INVALID_BLOCK_MARKDOWN` / `INVALID_RANGE` / `INVALID_MARKDOWN` / 422 발생 시: 페이로드가 잘못되었습니다. 재시도하지 말고 페이로드를 수정하여 새로 보내십시오.
- `COLLAB_SYNC_FAILED` / `REWRITE_BARRIER_FAILED` / `PROJECTION_STALE` / `INTERNAL_ERROR` / 5xx / 네트워크 에러 / 타임아웃 / **`collab.status: "pending"`인 202** 발생 시: 쓰기 작업이 반영되었을 가능성이 있습니다. `/state`를 다시 읽고 의도한 변경 사항(마크 존재 여부, 제안 적용 여부, 인용구 교체 여부 등)과 대조하여, 서버가 실제로 커밋하지 않은 경우에만 재시도하십시오. 대조 결과 반영된 것으로 확인되면 응답이 에러였더라도 성공으로 간주하십시오.

**루프 중단.** 최신 읽기 및 검증 후 재시도에도 불구하고 뮤테이션이 계속 실패하거나, 두 번의 읽기 결과가 일치하지 않는 경우, 차선책으로 넘어가기 전에 요청 ID, slug, 본문을 포함하여 `POST https://www.proofeditor.ai/api/bridge/report_bug`를 호출하십시오. 조용히 건너뛰지 마십시오. 사용자가 의존하고 있는 감사 기록(audit trail)이 손실될 수 있습니다.

---

## Phase 3: 터미널 보고서 (Terminal Report)

예외 중심 보고입니다. 사용자가 이미 Proof 문서에서 볼 수 있는 내용을 터미널에 반복하지 마십시오 — 각 스레드의 상세한 논거는 그곳에 있습니다. 터미널은 사용자가 다음에 내려야 할 결정을 위해 존재합니다.

모든 보고서는 현재 상태에 맞게 자연스럽게 구성된 세 가지 요소를 포함합니다:

- **처리된 내용** (예: 해결된 코멘트 수, 자동으로 적용된 편집 사항)
- **여전히 열려 있는 항목** — 에스컬레이션된 항목이 있는 경우, 각 항목에 대해 인용구 한 줄과 에이전트의 답글 또는 질문 한 줄을 표시합니다. 전체 컨텍스트는 Proof 스레드에 유지합니다.
- **문서 URL** — 항상 포함하십시오. 사용자가 탭을 닫았을 수도 있습니다.

전체 보고서를 한눈에 파악할 수 있도록 유지하십시오. 세 가지 일반적인 형태는 다음과 같습니다:

- 모든 항목이 처리된 깨끗한 패스는 한 줄 요약과 문서 URL로 축소됩니다.
- 에스컬레이션이 있는 패스는 처리된 내용 요약 후 열린 스레드들을 간결하게 나열합니다.
- 새로운 피드백이 없는 패스는 그 사실을 알리고 문서를 안내합니다.

템플릿에 맞추려 하기보다 상황에 맞는 어조로 표현하십시오 — "4건 처리, 1건 확인 필요" 또는 "5건 모두 처리 완료, 문서 준비됨" 모두 좋습니다.

---

## Phase 4: 다음 신호 프롬프트 (Next-Signal Prompt)

플랫폼의 차단형 질문 도구(Claude Code의 `AskUserQuestion` (필요 시 `ToolSearch select:AskUserQuestion`), Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 사용자에게 질문하십시오. 하네스에 차단 도구가 없거나 에러가 발생하는 경우에만 차선책으로 채팅에 옵션을 제시하십시오. 절대로 질문을 조용히 생략하지 마십시오.

**질문:** "Proof 리뷰 패스가 완료되었습니다. 다음은 무엇을 할까요?"

다음 의도들을 커버하는 옵션을 제공하십시오 — 에이전트 내부 용어(end-sync, ingest pass 등)가 아닌 사용자 중심의 구체적인 레이블을 사용하십시오. 현재 상태에 적합한 옵션만 포함하십시오. 레이블은 명령형이자 3인칭으로 작성하고(에이전트인지 사용자인지 모호한 "I'll" / "I'm" 지양), `[짧은 레이블] — [설명]` 형식을 유지하십시오. "여전히 작업 중" 옵션은 제공하지 않습니다. 차단형 질문이 이미 대기 중이므로 해당 옵션은 아무 동작도 하지 않는 래퍼일 뿐입니다.

- **논의 (Discuss)** → `Discuss — 터미널에서 열린 스레드 검토`
  터미널에서 열린 스레드들에 대해 대화합니다. 에이전트는 결정 사항을 다시 Proof 스레드에 반영합니다. 에스컬레이션 항목이 있을 때만 유용합니다.
- **진행 (Proceed)** → `Save — 리뷰된 문서를 로컬 파일로 저장`
  Phase 5 최종 동기화로 이동합니다. 에스컬레이션이 여전히 열려 있다면 레이블에 이를 명시하십시오 (예: `Save with 3 threads still open`). 사용자가 중첩된 확인 창 대신 레이블을 통해 트레이드오프를 명시적으로 수락하게 합니다.
- **다시 확인 (Another pass)** → `Re-check — Proof에서 새로운 코멘트 확인`
  상태를 다시 읽고 수집(ingest)합니다. 보고서가 렌더링되는 동안 사용자가 코멘트를 추가했을 수 있으므로 깨끗한 패스 후에도 제공할 가치가 있습니다.
- **현재 작업 종료 (Done for now)** → `Pause — 저장하지 않고 중단`
  동기화 없이 중단합니다. 호출자에게 `status: done_for_now`와 함께 반환하며 최종 동기화는 수행하지 않습니다.

스레드 오픈 여부와 상관없이 동기화 확인은 Phase 5에서 발생합니다 — 이 단계는 로컬 파일 덮어쓰기 여부가 아니라 사용자가 다음에 무엇을 원하는지만 묻습니다.

---

## Phase 5: 최종 동기화 (End-Sync)

사용자가 **진행 (Proceed)**을 선택했을 때 실행됩니다. 무엇인가를 묻기 전에, Proof 내용이 업로드된 내용과 실제로 달라졌는지 확인하십시오 — 변화가 없다면 동기화할 내용도, 물어볼 이유도 없습니다.

1. 현재 상태를 가져옵니다: `x-share-token: <token>`과 함께 `GET /api/agent/{slug}/state`. 전체 응답 본문을 임시 파일(`$STATE_TMP`)에 저장하여, 나중에 Markdown 바이트를 디스크로 스트리밍할 때 개행 문자가 손실되지 않도록 하십시오. 해당 파일에서 `state.revision`을 추출하여 `$REVISION`에 저장합니다. 2단계 비교를 위해 `state.markdown`을 읽습니다.

2. `state.markdown`을 Phase 1에서 캡처한 `uploadedMarkdown`과 비교합니다.

   **동일한 경우** — 세션 동안 내용 변경이 없었습니다. 동기화 프롬프트를 건너뜁니다. 다음과 같이 표시하십시오:

   ```
   동기화할 변경 사항이 없습니다. 로컬 파일이 변경되지 않았습니다.
   Doc: <tokenUrl>
   ```

   Presence를 `status: completed`, 요약을 `"Review complete, no changes"`로 설정합니다. 호출자에게 `status: proceeded`, `localSynced: true` (로컬이 Proof와 일치함 — 쓰기 불필요), `revision: <state.revision>` 및 나머지 표준 필드와 함께 반환합니다.

   **다른 경우** — 3단계를 계속합니다.

3. 플랫폼의 차단형 질문 도구(Claude Code의 `AskUserQuestion` (필요 시 `ToolSearch select:AskUserQuestion`), Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user`)를 사용하여 질문하십시오. 하네스에 차단 도구가 없거나 에러가 발생하는 경우에만 차선책으로 채팅에 옵션을 제시하십시오. 절대로 질문을 조용히 생략하지 마십시오.

   **질문:** "리뷰된 문서를 `<localPath>`로 동기화할까요? Proof에는 리뷰 변경 사항이 반영되어 있으며, 로컬에는 리뷰 전 복사본이 있습니다."

   **옵션:**
   - **예, 지금 동기화 (Yes, sync now)** (기본값, 권장)
   - **아니오, 나중에 직접 가져오겠습니다 (Not yet, I'll pull it later)** (`localSynced: false`와 함께 호출자에게 반환)

   추가 프롬프트를 띄우는 이유: 사용자가 몇 시간 전에 리뷰를 시작하여 로컬 파일 상태를 잊었을 수 있습니다. 짧은 확인 과정을 통해 파일 쓰기를 명시적으로 보여줍니다. 호출자는 `localSynced`를 통해 하류 워크플로우에 로컬 파일이 동기화되지 않았음을 경고할 수 있습니다.

4. **예, 지금 동기화** 선택 시, 가져온 Markdown을 로컬에 씁니다 — `SKILL.md`의 `Workflow: Pull a Proof Doc to Local`을 참조하십시오:

   ```bash
   # $STATE_TMP는 1단계에서 /state 응답을 저장한 임시 파일입니다.
   TMP="${SOURCE}.proof-sync.$$"
   jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$SOURCE"
   rm "$STATE_TMP"
   ```

   `jq -jr`을 사용하여 저장된 상태 파일에서 직접 `.markdown` 바이트를 스트리밍하십시오 — Markdown을 쉘 변수에 담지 마십시오. `$(...)`는 마지막 개행 문자를 제거하여 파일을 손상시킬 수 있습니다. 1단계에서 별도로 추출한 `$REVISION`은 변수로 유지해도 안전합니다.

   **아니오** 선택 시, 쓰기 작업을 건너뜁니다 (단, `$STATE_TMP`는 정리하십시오).

5. Presence를 `status: completed`, 요약을 `"Review synced to <localPath>"` (동기화 거부 시 `"Review complete, local not updated"`)로 설정하여 Proof UI에 루프가 완료되었음을 알립니다.

6. 다음 중 하나를 표시하십시오:

   동기화 완료:
   ```
   문서가 <localPath>로 동기화되었습니다 (리비전 <N>).
   Doc: <tokenUrl>
   ```

   동기화 거부:
   ```
   리뷰가 완료되었습니다. 로컬 파일은 그대로 유지됩니다 — 준비가 되면 Proof에서 가져오십시오.
   Doc: <tokenUrl>
   ```

7. 호출자에게 다음을 반환합니다:
   ```
   status: proceeded
   localPath: <source>
   localSynced: true | false
   docUrl: <tokenUrl>
   openThreadCount: <K>
   revision: <N>
   ```

Proof 문서를 삭제하지 **마십시오**. 리뷰 기록으로 유지되어야 하며, 호출자의 워크플로우에서 다시 링크를 참조할 수 있습니다.

---

## 레시피 (Recipes)

### BaseToken 인식 뮤테이션

가장 최근의 `/state` 읽기에서 얻은 `baseToken`을 재사용하십시오. `STALE_BASE` / `BASE_TOKEN_REQUIRED` 발생 시에만 다시 읽으십시오. 수집 패스의 경우, N번의 뮤테이션에 대해 N번의 읽기가 아닌 Phase 2.1에서 한 번 읽은 `/state`가 모든 후속 뮤테이션에 공급됨을 의미합니다.

두 종류의 재시도 클래스가 있으며 다르게 동작합니다. 아래의 헬퍼는 안전한 클래스만 다룹니다. 모호한 클래스는 페이로드(markId, 인용구 교체, 스레드 답글 등)에 따라 "이 쓰기가 반영되었는가?"가 달라지므로 호출자가 직접 검증기를 제공해야 합니다.

```bash
SLUG=<slug>
TOKEN=<accessToken>
AGENT_ID=ai:compound-engineering
BASE=<가장 최근의 /state 또는 /snapshot 읽기에서 캐싱됨>

mutate() {
  local PAYLOAD="$1"  # baseToken이 없는 jq 템플릿
  local IDEM_KEY BODY RESP CODE
  # 논리적 쓰기당(mutate() 호출당) 새로운 키를 생성합니다.
  # 이 키는 이 단일 논리적 쓰기의 재시도 내에서만 재사용됩니다.
  # 서로 다른 페이로드에 동일한 키를 사용하지 마십시오. 서버가 별개의
  # 쓰기를 중복으로 간주하여 나중의 편집을 조용히 삭제할 수 있습니다.
  IDEM_KEY=$(uuidgen)
  BODY=$(jq -n --arg base "$BASE" --argjson payload "$PAYLOAD" '$payload + {baseToken: $base}')
  RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
    -H "Content-Type: application/json" \
    -H "x-share-token: $TOKEN" \
    -H "X-Agent-Id: $AGENT_ID" \
    -H "Idempotency-Key: $IDEM_KEY" \
    -d "$BODY")
  CODE=$(printf '%s' "$RESP" | jq -r '.code // .error // empty')
  # 커밋 전 토큰 관련 에러 — 동일한 페이로드와 새로운 baseToken으로
  # 안전하게 자동 재시도가 가능합니다. 앵커 에러(ANCHOR_NOT_FOUND,
  # ANCHOR_AMBIGUOUS) 또한 커밋 전이지만 더 좁은 인용구가 필요하므로,
  # 자동 재시도 대신 에러를 노출합니다.
  if [ "$CODE" = "STALE_BASE" ] \
    || [ "$CODE" = "BASE_TOKEN_REQUIRED" ] \
    || [ "$CODE" = "MISSING_BASE" ] \
    || [ "$CODE" = "INVALID_BASE_TOKEN" ]; then
    BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
      -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
    BODY=$(jq -n --arg base "$BASE" --argjson payload "$PAYLOAD" '$payload + {baseToken: $base}')
    RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
      -H "Content-Type: application/json" \
      -H "x-share-token: $TOKEN" \
      -H "X-Agent-Id: $AGENT_ID" \
      -H "Idempotency-Key: $IDEM_KEY" \
      -d "$BODY")
  fi
  printf '%s' "$RESP"
}
```

`Idempotency-Key`는 각 호출 시작 시 새로 생성됩니다 (논리적 쓰기당 하나의 키). 동일한 호출 내부의 재시도는 해당 키를 재사용하여 서버가 중복 TCP 전송을 결합할 수 있게 하지만, 다른 페이로드를 위한 후속 `mutate()`는 고유한 키를 갖습니다. 함수 외부에서 키를 생성하면 모든 호출이 하나의 키를 공유하게 되어, 서버는 두 번째 이후의 쓰기를 첫 번째의 중복으로 취급하고 조용히 무시합니다.

**모호한 실패 (위의 커밋 전 세트 외의 모든 것 — `COLLAB_SYNC_FAILED`, `INTERNAL_ERROR`, 5xx, 네트워크 타임아웃, `collab.status: "pending"`인 202):** 이 헬퍼에서 재시도하지 마십시오. 호출자에서 `/state`를 다시 읽고, 마크/내용을 의도한 변경 사항과 대조하여 반영되지 않았음이 증명된 경우에만 다시 쓰기를 시도하십시오. 패턴 예시:

```bash
# 인용구 "X", 텍스트 "Y"의 comment.add 호출이 모호하게 실패한 후:
STATE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN")
LANDED=$(printf '%s' "$STATE" | jq --arg q "X" --arg t "Y" \
  '[.marks[]? | select(.by == "ai:compound-engineering" and .quote == $q and (.thread[0].text // .text) == $t)] | length')
if [ "$LANDED" -gt 0 ]; then
  echo "이미 적용됨 — 재시도 생략."
else
  # 새로운 BASE와 함께 안전하게 재시도 가능.
  ...
fi
```

페이로드를 식별할 수 있는 필드로 대조하십시오 (`comment.add`는 인용구 + 텍스트; `suggestion.add`는 인용구 + 내용; `comment.reply`는 markId + 텍스트; `/edit/v2`는 블록 서순 + Markdown). 이러한 불변값이 없는 경우, 중복 마크 생성 위험을 감수하기보다 쓰기를 수행하지 않고 터미널 보고서에 노출하는 쪽을 선택하십시오.

### API 응답 검사 시 jq 주의 사항

jq의 `//` 대체 연산자를 사용하여 API 응답에서 필드를 추출할 때, 객체 생성자 내부에서는 괄호를 사용하십시오 — jq는 `{markId: .markId // .result.markId}`를 구문 에러로 처리합니다. `{markId: (.markId // .result.markId)}`를 사용하거나, 객체 외부에서 값을 추출하십시오: `jq -r '.markId // .result.markId'`.

### ID (Identity)

모든 작업(ops)은 다음을 포함해야 합니다:
- 요청 본문의 `by: "ai:compound-engineering"`
- 헤더의 `X-Agent-Id: ai:compound-engineering` (Presence에 필수, 작업 속성 일관성을 위해 권장)

표시 이름 `Compound Engineering`은 `POST /presence` 호출의 `{"name":"Compound Engineering", ...}`를 통해 결합됩니다. 업로드 후 한 번 설정하면 이후의 작업들에 유지됩니다.
