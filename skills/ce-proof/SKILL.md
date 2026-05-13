---
name: ce-proof
description: proofeditor.ai("Proof editor")의 협업 마크다운 에디터인 Proof를 통해 마크다운 문서에 대해 생성, 공유, 보기, 댓글 달기, 편집 및 인간 참여형(human-in-the-loop) 리뷰 루프를 실행합니다. 사용자가 로컬 마크다운 파일을 Proof에서 렌더링하거나 보기를 원할 때, 마크다운을 공유하여 URL을 얻고 싶을 때, Proof 문서에서 협업 반복 작업을 수행하고 싶을 때, Proof에서 댓글을 달거나 수정을 제안하고 싶을 때, 사양/계획/초안에 대해 인간 리뷰(HITL)를 수행하고 싶을 때, Proof 문서를 로컬로 다시 동기화하고 싶을 때, 또는 proofeditor.ai URL을 기반으로 작업하고 싶을 때 사용합니다. "view this in proof", "share to proof", "iterate with proof", "HITL this doc"과 같은 문구와 인간 리뷰를 위한 ce-brainstorm / ce-ideate / ce-plan의 핸드오프 시 트리거됩니다. 또한 사용자가 Proof라는 이름을 언급하지 않더라도 렌더링/공유된 마크다운 리뷰 인터페이스를 명확히 요청하는 경우에도 매칭됩니다. 증거(evidence), 수학/논리 증명, 입증 책임(burden of proof), 개념 증명(proof-of-concept) 또는 인라인 텍스트 리뷰가 예상되는 단순한 "proofread this" 요청에는 트리거되지 않습니다.
allowed-tools:
  - gem

  - Bash
  - Read
  - Write
  - WebFetch
---

# Proof - 협업 마크다운 에디터 (Collaborative Markdown Editor)

## 다중 에이전트 협업 (Multi-Agent Collaboration)

사용자의 입력(`$ARGUMENTS`) 내에 `--add <ai-이름>` 형태의 플래그가 포함되어 있는지 확인하십시오. 
현재 지원되는 외부 AI 인터페이스는 `--add gemini` (또는 `--add gem`)입니다.

만약 해당 플래그가 감지되면, 작업을 단독으로 확정하지 말고 다음 절차를 따르십시오:
1. **의도 파악:** 플래그를 제외한 나머지 문자열을 실제 지시사항으로 간주합니다.
2. **초안 작성:** 본인(주 에이전트)의 지식과 코드베이스 컨텍스트를 바탕으로 작업의 초기 뼈대나 접근법을 생각합니다.
3. **MCP 협업 호출:** `gem` 도구를 호출하여 외부 Gemini 에이전트에게 조언이나 검토를 구합니다.
   - 호출 시 전달할 메시지 예시: "나는 현재 이 작업에 대한 초안을 세우고 있어. 내 초안은 [초안 요약]이야. 이 접근 방식의 기술적 타당성을 검토하고 누락된 에지 케이스나 더 나은 패턴을 조언해줄 수 있어?"
4. **결과 통합:** `gem` 도구가 반환한 피드백을 당신의 최종 결과물에 통합(Synthesis)합니다. 
5. **명시적 표시:** 최종 산출물의 상단 또는 설명 부분에 "이 결과물은 Gemini와의 협업을 통해 검토 및 보완되었습니다."라는 문구를 추가하십시오.

이 협업 절차를 염두에 두고 아래의 본래 스킬 워크플로우를 진행하십시오.


Proof는 인간과 에이전트를 위한 협업 문서 에디터입니다. 두 가지 모드를 지원합니다:

1. **Web API** - HTTP를 통해 공유 문서를 생성하고 편집합니다 (설치 불필요).
2. **Local Bridge** - localhost:9847을 통해 macOS Proof 앱을 구동합니다.

## 정체성 및 귀속 (Identity and Attribution)

Proof 문서에 대한 모든 쓰기 작업에는 주체가 명시되어야 합니다. 다음 두 필드가 에이전트의 정체성을 나타냅니다:

- **머신 ID (모든 작업의 `by`, `X-Agent-Id` 헤더):** `ai:compound-engineering` — 안정적이고 소문자 하이픈 형식을 가진 머신 파싱 가능한 ID입니다. 마크, 이벤트 및 API 응답에 표시됩니다.
- **표시 이름 (`POST /presence`의 `name`):** `Compound Engineering` — 인간이 읽을 수 있는 이름으로, Proof의 현재 참여자 칩과 댓글 작성자 배지에 표시됩니다.

문서 세션당 한 번 `X-Agent-Id` 헤더와 함께 presence에 포스팅하여 표시 이름을 설정하십시오. Proof는 해당 세션 동안 해당 에이전트 ID에 이름을 바인딩합니다. 이 값들은 이 스킬의 모든 호출자에 대한 기본값입니다. HITL 리뷰(`references/hitl-review.md`)를 실행하는 호출자는 별도의 서브 에이전트가 문서를 소유해야 하는 경우 다른 `identity` 쌍을 전달할 수 있습니다. `ai:compound`나 다른 임의의 변형을 사용하지 마십시오 — 호출자가 명시적으로 재정의하지 않는 한 정체성은 균일하게 유지됩니다.

## 인간 참여형 리뷰 모드 (Human-in-the-Loop Review Mode)

기존 로컬 마크다운 파일에 대한 인간 참여형 반복 작업: Proof에 업로드하고, 사용자가 Proof의 웹 UI에서 주석을 달게 한 다음, 피드백을 인레드 답글 및 추적된 편집 사항으로 수집하고, 최종 문서를 디스크에 다시 동기화합니다. 두 가지 진입점이 있으며 메커니즘은 동일합니다. 두 경우 모두 전체 루프 사양(호출 계약, 마크 분류, 멱등성 수집 패스, 예외 기반 터미널 보고, 최종 동기화 원자적 쓰기)에 대해 `references/hitl-review.md`를 로드하십시오:

- **사용자 직접 요청** — 로컬 마크다운 파일을 지칭하며 Proof를 통해 협업 반복 작업을 요청하는 단순한 사용자 문구: "share this to proof so we can iterate", "iterate with proof on this doc", "HITL this file with me", "let's get feedback on this in proof", "open this in proof editor so I can review". 파일은 사용자가 방금 생성, 편집 또는 참조한 마크다운 파일입니다. 모호한 경우 어떤 파일인지 질문하십시오. 이것은 최우선 진입점이며 상위 호출자가 필요하지 않습니다.
- **업무 스킬 핸드오프 (Upstream skill handoff)** — `ce-brainstorm`, `ce-ideate` 또는 `ce-plan`이 초안을 완료하고 다음 단계 전 인간 리뷰를 위해 핸드오프하며 파일 경로와 제목을 명시적으로 전달합니다.

## 웹 API (공유를 위한 주요 방식)

### 공유 문서 생성 (Create a Shared Document)

인증이 필요하지 않습니다. 액세스 토큰이 포함된 공유 가능한 URL을 반환합니다.

```bash
curl -X POST https://www.proofeditor.ai/share/markdown \
  -H "Content-Type: application/json" \
  -d '{"title":"My Doc","markdown":"# Hello\n\nContent here."}'
```

**응답 형식:**
```json
{
  "slug": "abc123",
  "tokenUrl": "https://www.proofeditor.ai/d/abc123?token=xxx",
  "accessToken": "xxx",
  "ownerSecret": "yyy",
  "_links": {
    "state": "https://www.proofeditor.ai/api/agent/abc123/state",
    "ops": "https://www.proofeditor.ai/api/agent/abc123/ops"
  }
}
```

`tokenUrl`을 공유 가능한 링크로 사용하십시오. `_links`는 정확한 API 경로를 제공합니다.

### 공유 문서 읽기 (Read a Shared Document)

```bash
curl -s "https://www.proofeditor.ai/api/agent/{slug}/state" \
  -H "x-share-token: <token>"
```

### 공유 문서 편집 (Edit a Shared Document)

모든 작업은 `POST https://www.proofeditor.ai/api/agent/{slug}/ops`로 전송됩니다.

**참고:** 생성 응답의 `_links`에 있는 `/api/agent/{slug}/ops` 경로를 사용하십시오. `/api/documents/{slug}/ops`가 아닙니다.

**보호된 문서에 대한 인증:**
- 헤더: `x-share-token: <token>` 또는 `Authorization: Bearer <token>`
- 토큰은 URL 파라미터 `?token=xxx` 또는 생성 응답의 `accessToken`에서 가져옵니다.
- 헤더: `X-Agent-Id: ai:compound-engineering` (presence를 위해 필수이며, 일관된 귀속을 위해 작업 시 포함하십시오)

**전송 형식 주의 사항:** `/api/agent/{slug}/ops`는 최상위 `type` 필드를 사용합니다. `/api/agent/{slug}/edit/v2`는 각 항목에 `op`가 있는 `operations` 배열을 사용합니다. 혼용하지 마십시오. `/ops`에 `op`를 보내면 422 오류를 반환합니다.

**모든 변경 작업에는 `baseToken`이 필요합니다.** 가장 최근의 `/state` 또는 `/snapshot` 읽기에서 얻은 `mutationBase.token`을 재사용하십시오. 토큰은 몇 초 만에 만료되지 않으며, `STALE_BASE`는 복구 가능한 오류입니다. `BASE_TOKEN_REQUIRED` 또는 `STALE_BASE` 발생 시 다시 읽고 한 번 더 시도하십시오. 이 세션에서 이전에 읽은 적이 없는 경우에만 변경 전 읽기를 수행하십시오. `references/hitl-review.md`의 baseToken 레시피를 참조하십시오.

`/edit/v2` 블록 참조(block refs)는 별개의 문제입니다. 버전 간에 변경될 수 있으므로, 마지막 스냅샷 이후 쓰기 작업이 발생했다면 블록 편집 전에 `/snapshot`을 다시 호출하여 신선한 참조를 가져오십시오.

**변경 오류 후 재시도 원칙 — 재시도 전 확인 필수.** 오류 응답이 아무것도 기록되지 않았음을 증명하지는 않습니다.

- `STALE_BASE`, `BASE_TOKEN_REQUIRED`, `MISSING_BASE`, `INVALID_BASE_TOKEN` — 커밋 전 토큰 관련 오류입니다. `/state`를 다시 읽고 동일한 페이로드와 새로운 `baseToken`으로 한 번 더 시도하십시오. 일반적인 변경 헬퍼는 이를 자동 재시도할 수 있습니다.
- `ANCHOR_NOT_FOUND`, `ANCHOR_AMBIGUOUS` — 커밋 전 단계이지만, `quote`가 더 이상 콘텐츠와 고유하게 일치하지 않습니다. 단순히 다시 읽는 것만으로는 도움이 되지 않습니다. 호출자는 재시도 전 앵커를 좁히거나 다시 생성해야 합니다. 맹목적으로 자동 재시도하지 마십시오.
- `INVALID_OPERATIONS`, `INVALID_REQUEST`, `INVALID_REF`, `INVALID_BLOCK_MARKDOWN`, `INVALID_RANGE`, `INVALID_MARKDOWN`, 422 — 커밋 전 단계이지만 페이로드가 잘못되었습니다. 맹목적으로 재시도하지 말고 페이로드를 먼저 수정하십시오.
- `COLLAB_SYNC_FAILED`, `REWRITE_BARRIER_FAILED`, `PROJECTION_STALE`, `INTERNAL_ERROR`, 5xx, 네트워크 타임아웃, 그리고 **`collab.status: "pending"`인 모든 202 응답** — 호출이 실패처럼 보이더라도 표준 문서가 이미 작성되었을 수 있습니다. 재시도 전에 `/state`를 다시 읽고 의도한 마크/편집 사항이 이미 존재하는지 확인하십시오. 존재하지 않는 경우에만 재시도하십시오.
- `Idempotency-Key` (아래 참조)는 동일한 요청(예: TCP 수준 재시도)에 대한 중복 적용을 방지합니다. 새로운 요청 본문을 구성하여 두 번째 호출을 보내는 경우에는 도움이 되지 않습니다. 그것은 새로운 키를 가진 새로운 논리적 쓰기입니다.

중복 마크 사고는 보통 확인 없이 타임아웃 후 `comment.add` 또는 `suggestion.add`를 재시도할 때 발생합니다. 의심스러운 경우: 다시 읽고, 비교(diff)하고, 결정하십시오.

**`Idempotency-Key` 헤더**는 안전한 자동 재시도를 위해 모든 변경 작업에 권장됩니다. `/state.contract.idempotencyRequired`가 true인 경우에는 필수입니다. 동일한 논리적 쓰기(동일한 페이로드)를 재시도할 때 동일한 키를 사용하여 서버가 재시도를 병합할 수 있도록 하십시오. 페이로드가 동일하더라도 키가 다르면 새로운 쓰기를 의미합니다.

**텍스트에 댓글 달기:**
```json
{"type": "comment.add", "quote": "text to comment on", "by": "ai:compound-engineering", "text": "Your comment here", "baseToken": "<token>"}
```

**댓글에 답글 달기:**
```json
{"type": "comment.reply", "markId": "<id>", "by": "ai:compound-engineering", "text": "Reply text", "baseToken": "<token>"}
```

**댓글 해결 / 해결 취소:**
```json
{"type": "comment.resolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "comment.unresolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

**수정 제안 (대기 중 — 사용자가 승인/거절해야 함):**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "baseToken": "<token>"}
```

**수정 제안 및 즉시 적용 (추적되지만 커밋됨 — 사용자가 거절하여 되돌릴 수 있음):**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "status": "accepted", "baseToken": "<token>"}
```

`status: "accepted"`는 제안 마크 생성과 변경 사항 커밋을 한 번의 호출로 수행합니다. 마크는 편집별 귀속 정보와 거절-후-되돌리기 기능을 갖춘 감사 추적(audit trail)으로 남습니다. `kind: "insert" | "delete" | "replace"`와 함께 작동합니다.

**기존 제안 승인 또는 거절:**
```json
{"type": "suggestion.accept", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "suggestion.reject", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

`suggestion.resolve`는 지원되지 않습니다 — 대신 승인(accept) 또는 거절(reject)을 사용하십시오.

**일괄 재작성 (전체 문서 교체):**
```json
{"type": "rewrite.apply", "content": "full new markdown", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

**`/edit/v2`를 통한 블록 수준 편집** (별도 엔드포인트, 별도 형식):
```bash
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" \
  -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: <uuid>" \
  -d '{
    "by": "ai:compound-engineering",
    "baseToken": "mt1:<token>",
    "operations": [
      {"op": "replace_block", "ref": "b3", "block": {"markdown": "Updated paragraph."}},
      {"op": "insert_after", "ref": "b3", "blocks": [{"markdown": "## New section"}]}
    ]
  }'
```

작업별 본문 형식 (단수 `block`과 복수 `blocks`의 구분은 매우 중요합니다. 잘못 보내면 422를 반환합니다):

| op | body 필드 |
|---|---|
| `replace_block` | `ref`, `block: {markdown}` |
| `insert_after` | `ref`, `blocks: [{markdown}, ...]` |
| `insert_before` | `ref`, `blocks: [{markdown}, ...]` |
| `delete_block` | `ref` |
| `replace_range` | `fromRef`, `toRef`, `blocks: [{markdown}, ...]` |
| `find_replace_in_block` | `ref`, `find`, `replace`, `occurrence: "first" \| "all"` |

안정적인 블록 `ref` ID를 가져오려면 `/snapshot`을 호출하십시오. `operations`는 원자적으로 커밋됩니다. 즉, 모든 작업이 적용되거나 아무것도 적용되지 않습니다. 따라서 한 번의 `/edit/v2` 호출로 수십 개의 블록 편집을 안전하고 효율적으로 일괄 처리할 수 있습니다 (`references/hitl-review.md` Phase 2.4의 일괄 스윕 안내 참조).

**클라이언트가 연결된 상태에서 편집하는 것도 가능합니다.** `/edit/v2`, `suggestion.add` (`status: "accepted"` 포함) 및 모든 댓글 작업은 활성 협업 중에 작동합니다. 오직 `rewrite.apply`만 `LIVE_CLIENTS_PRESENT`에 의해 차단됩니다. 이는 진행 중인 Yjs 편집 사항을 덮어쓸 수 있기 때문입니다.

**루프가 끊기는 경우.** 신선한 읽기와 한 번의 재시도 후에도 변경 작업이 계속 실패하거나 읽기 간의 상태가 일치하지 않는 경우, 실패한 요청 ID, slug 및 원본 응답과 함께 `POST https://www.proofeditor.ai/api/bridge/report_bug`를 호출하십시오. 서버가 정보를 보강하여 이슈를 생성합니다.

### 알려진 제한 사항 (웹 API)

- 브릿지 스타일 엔드포인트(`/d/{slug}/bridge/*`)는 클라이언트 버전 헤더(`x-proof-client-version`, `x-proof-client-build`, `x-proof-client-protocol`)가 필요하며, 헤더가 없으면 426 CLIENT_UPGRADE_REQUIRED를 반환합니다. 대신 `/api/agent/{slug}/ops`를 사용하십시오.

## 로컬 브릿지 (macOS 앱)

Proof.app이 실행 중이어야 합니다. 브릿지는 `http://localhost:9847`에서 작동합니다.

**필수 헤더:**
- `X-Agent-Id: claude` (presence를 위한 정체성)
- `Content-Type: application/json`
- `X-Window-Id: <uuid>` (여러 문서가 열려 있는 경우)

### 주요 엔드포인트

| 메서드 | 엔드포인트 | 용도 |
|--------|----------|---------|
| GET | `/windows` | 열린 문서 목록 표시 |
| GET | `/state` | 마크다운, 커서, 단어 수 읽기 |
| GET | `/marks` | 모든 제안 및 댓글 목록 표시 |
| POST | `/marks/suggest-replace` | `{"quote":"old","by":"ai:compound-engineering","content":"new"}` |
| POST | `/marks/suggest-insert` | `{"quote":"after this","by":"ai:compound-engineering","content":"insert"}` |
| POST | `/marks/suggest-delete` | `{"quote":"delete this","by":"ai:compound-engineering"}` |
| POST | `/marks/comment` | `{"quote":"text","by":"ai:compound-engineering","text":"comment"}` |
| POST | `/marks/reply` | `{"markId":"<id>","by":"ai:compound-engineering","text":"reply"}` |
| POST | `/marks/resolve` | `{"markId":"<id>","by":"ai:compound-engineering"}` |
| POST | `/marks/accept` | `{"markId":"<id>"}` |
| POST | `/marks/reject` | `{"markId":"<id>"}` |
| POST | `/rewrite` | `{"content":"full markdown","by":"ai:compound-engineering"}` |
| POST | `/presence` | `{"status":"reading","summary":"..."}` |
| GET | `/events/pending` | 사용자 작업 폴링 |

### Presence 상태

`thinking`, `reading`, `idle`, `acting`, `waiting`, `completed`

## 워크플로우: 공유 문서 리뷰

`https://www.proofeditor.ai/d/abc123?token=xxx`와 같은 Proof URL이 주어졌을 때:

1. URL에서 slug(`abc123`)와 토큰을 추출합니다.
2. API를 통해 문서 상태를 읽습니다.
3. ops 엔드포인트를 사용하여 댓글을 추가하거나 수정을 제안합니다.
4. 작성자는 변경 사항을 실시간으로 확인합니다.

```bash
# 한 번 읽기 — 동일한 응답에서 문서 콘텐츠와 아래 모든 변경 작업에 필요한 baseToken을 모두 얻습니다.
STATE=$(curl -s "https://www.proofeditor.ai/api/agent/abc123/state" \
  -H "x-share-token: xxx")
BASE=$(printf '%s' "$STATE" | jq -r '.mutationBase.token')
# 필요에 따라 문서 필드 검사: printf '%s' "$STATE" | jq '.markdown, .revision'

# 댓글 달기
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"text",by:"ai:compound-engineering",text:"comment",baseToken:$base}')"

# 수정 제안 (추적됨, 대기 중)
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",baseToken:$base}')"

# 수정 제안 및 즉시 적용 (추적됨, 커밋됨)
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",status:"accepted",baseToken:$base}')"
```

## 워크플로우: 새 문서 생성 및 공유

```bash
# 1. 생성
RESPONSE=$(curl -s -X POST https://www.proofeditor.ai/share/markdown \
  -H "Content-Type: application/json" \
  -d '{"title":"My Doc","markdown":"# Title\n\nContent here."}')

# 2. URL 및 토큰 추출
URL=$(echo "$RESPONSE" | jq -r '.tokenUrl')
SLUG=$(echo "$RESPONSE" | jq -r '.slug')
TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')

# 3. presence를 통해 표시 이름 바인딩
curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/presence" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d '{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc"}'

# 4. URL 공유
echo "$URL"

# 5. ops 엔드포인트를 사용하여 편집 (baseToken 필요)
BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
curl -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"Content here",by:"ai:compound-engineering",text:"Added a note",baseToken:$base}')"
```

## 워크플로우: Proof 문서를 로컬로 가져오기 (Pull)

현재 Proof 문서 상태를 로컬 마크다운 파일로 동기화합니다. 다음에서 사용됩니다:

- 로컬 파일에서 시작된 문서의 HITL 리뷰 최종 동기화 (`references/hitl-review.md` Phase 5)
- Proof 문서의 임시 스냅샷 디스크 저장 (탭 닫기 전, 아카이브, 핸드오프)
- 라이브 Proof 버전에 대해 로컬 작업 복사본 새로고침

```bash
SLUG=<slug>
TOKEN=<accessToken>
LOCAL=<absolute-path>

# 임시 파일로 한 번 읽기 — 마크다운이 $(...)를 거치면서 마지막 줄바꿈이 제거되는 것을 방지합니다.
STATE_TMP=$(mktemp)
curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" > "$STATE_TMP"
REVISION=$(jq -r '.revision' "$STATE_TMP")

# 원자적 쓰기: .markdown 바이트를 임시 형제 파일로 직접 스트리밍한 후 이름을 바꿉니다.
TMP="${LOCAL}.proof-sync.$$"
jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$LOCAL"
rm "$STATE_TMP"
```

`jq -jr` (`-j` 줄바꿈 미추가, `-r` 원본 문자열)는 마크다운 바이트를 쉘 변수를 거치지 않고 임시 파일로 직접 스트리밍하므로 마지막 줄바꿈이 그대로 유지됩니다. 동일한 파일 시스템 내의 `mv`는 원자적(atomic)입니다. 쓰기 도중 충돌이 발생하더라도 파일이 반만 작성되지 않고 원본 파일이 그대로 유지됩니다.

**가져오기가 직접적으로 요청되지 않은 경우 작성 전 확인을 받으십시오.** 다른 작업의 부수 효과로 동기화가 발생하는 경우(예: HITL 리뷰 완료), "Sync reviewed doc to `<localPath>`?"와 같이 짧은 확인 문구로 서술적인 쓰기를 알리십시오. 조용히 덮어쓰는 것은 당황스러울 수 있습니다. 사용자가 해당 세션에 로컬 파일이 존재한다는 사실을 잊었거나, 명시적으로 요청하기 전까지는 Proof가 기준이 되기를 기대했을 수 있습니다.

## 안전 사항

- 편집 전 `/state` 콘텐츠를 진실의 원천으로 사용하십시오.
- 활성 협업 중에는 `edit/v2` (직접 블록 변경) 또는 `suggestion.add` (추적된 변경)를 사용하십시오. `rewrite.apply`는 누군가 연결되어 있을 때 `LIVE_CLIENTS_PRESENT`에 의해 차단되므로 클라이언트가 없는 시나리오를 위해 남겨두십시오.
- 단일 교체 작업으로 테이블 셀을 가로지르지 마십시오.
- 일관된 귀속을 위해 모든 작업에 `by: "ai:compound-engineering"`을 포함하고 헤더에 `X-Agent-Id: ai:compound-engineering`을 포함하십시오.
- 가장 최근의 `/state` 또는 `/snapshot` 읽기에서 얻은 `baseToken`을 재사용하십시오. `STALE_BASE` 발생 시 다시 읽고 한 번 더 시도하십시오.
