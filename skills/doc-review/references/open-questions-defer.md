# Open Questions Deferral (미결 질문 지연)

이 참조 문서는 Defer(지연) 작업의 문서 내 추가(append) 메커니즘을 정의합니다. 사용자가 발견 사항에 대해 Defer를 선택하면(워크스루 또는 일괄 미리보기의 Append-to-Open-Questions 경로를 통해), 해당 발견 사항에 대한 항목이 검토 중인 문서 끝의 `## Deferred / Open Questions` 섹션에 추가됩니다.

Interactive 모드 전용입니다. `references/walkthrough.md`(발견 사항별 Defer 옵션) 및 `references/bulk-preview.md`(라우팅 옵션 C Proceed)에서 호출됩니다.

---

## 추가 흐름 (Append flow)

### 1단계: Open Questions 섹션 찾기 또는 생성

문서에서 기존의 `## Deferred / Open Questions` 헤딩을 검색합니다(대소문자 구분하여 전체 헤딩 텍스트 일치 여부 확인). 위치에 따른 동작:

- **문서 끝(마지막 `##` 레벨 섹션)에 헤딩이 있는 경우:** 해당 섹션의 끝에 새 내용을 추가합니다.
- **문서 중간(마지막 `##` 레벨 섹션이 아님)에 헤딩이 있는 경우:** 여전히 해당 위치의 기존 헤딩 내에 추가합니다. 끝에 중복해서 생성하지 않습니다 — 사용자가 의도적으로 해당 위치에 섹션을 배치한 것으로 간주합니다.
- **헤딩이 없는 경우:** 문서 끝에 `## Deferred / Open Questions`를 생성합니다. 문서에 후행 수평선 구분 기호(`---`)나 후행 푸터(테이블, 링크 섹션)가 있는 경우, 그 위에 새 섹션을 삽입합니다. 문서에 프론트매터(frontmatter)만 있고 본문이 없는 경우, 프론트매터 블록 다음에 섹션을 생성합니다(0번 바이트가 아님).

### 2단계: 타임스탬프가 찍힌 하위 섹션 찾기 또는 생성

Open Questions 섹션 내에서 현재 검토 날짜와 일치하는 하위 섹션 헤딩 `### From YYYY-MM-DD review`를 검색합니다. 동작:

- **하위 섹션이 있는 경우:** 해당 섹션에 새 항목을 추가합니다. 단일 검토 세션 내의 여러 Defer 작업은 동일한 하위 섹션 아래에 누적됩니다.
- **하위 섹션이 없는 경우:** Open Questions 섹션 내의 마지막 하위 섹션으로 `### From YYYY-MM-DD review`를 생성합니다. 가독성을 위해 헤딩 앞에 빈 줄을 하나 삽입합니다.

날짜 형식: ISO 8601 달력 날짜(`YYYY-MM-DD`). 동일한 세션 내에서 동일한 문서에 대해 하루에 여러 번 검토가 수행되더라도 동일한 하위 섹션을 공유합니다. 며칠에 걸쳐 동일한 문서를 검토하는 경우에는 별도의 하위 섹션이 생성되며, 이는 의도된 동작입니다.

### 3단계: 항목 형식 지정 및 추가

지연된 발견 사항마다 다음 필드가 포함된 불렛 포인트 항목을 추가합니다. 표시되는 내용은 독자 친화적인 요약입니다. 항목의 HTML 주석은 `dedup-key` 필드를 유지하여 4단계의 복합 키(compound-key) 체크가 재시도 및 당일 재실행 시에도 안정적으로 실행될 수 있도록 합니다. 항목 형식 자체가 기계용 메타데이터를 가질 필요는 없습니다.

```
- **{title}** — {section} ({severity}, {reviewer}, confidence {confidence})

  {why_it_matters}

  <!-- dedup-key: section="{normalized_section}" title="{normalized_title}" evidence="{evidence_fingerprint}" -->
```

필드는 발견 사항의 스키마에서 가져옵니다:

- `{title}` — 발견 사항의 title 필드
- `{section}` — 발견 사항의 section 필드, 수정되지 않은 형태 (인간이 읽을 수 있는 형태)
- `{severity}` — P0 / P1 / P2 / P3
- `{reviewer}` — 발견 사항을 생성한 페르소나 (중복 제거 후 신뢰도 앵커가 가장 높은 페르소나; 여러 페르소나가 공동으로 지적한 경우 모두 표시)
- `{confidence}` — 정수 앵커(`50`, `75` 또는 `100`), 소수점이나 퍼센트 기호 없이 표시
- `{why_it_matters}` — 전체 why_it_matters 텍스트, subagent 템플릿의 프레이밍 가이드 유지

HTML 주석 필드 (기계 읽기용, 4단계 중복 제거에 사용):

- `{normalized_section}` — `normalize(section)` (소문자 변환, 문장 부호 제거, 공백 축소)
- `{normalized_title}` — `normalize(title)` (동일한 정규화 적용)
- `{evidence_fingerprint}` — 발견 사항의 첫 번째 증거(evidence) 인용문의 앞부분 약 120자, 단어 경계를 유지하며 단일 라인 HTML 주석 임베딩을 위해 정리됨. 발견 사항에 증거가 없는 경우 빈 문자열. 정리 규칙(120자 슬라이스 전에 순서대로 적용하여 지출 예산 내에 유지):
  1. 줄바꿈, 캐리지 리턴, 탭을 포함한 모든 연속된 공백을 단일 공백으로 축소합니다.
  2. `-->`(HTML 주석 종료자) 및 길을 잃은 `<!--` 시퀀스를 제거하고 각각 단일 공백으로 바꿉니다. 이는 증거 내용이 `dedup-key` 주석을 중간에 종료하거나 중첩된 주석을 주입하는 것을 방지합니다.
  3. 큰따옴표 문자를 `\"`로 바꿉니다(이전과 동일하게 따옴표 이스케이프).
  4. 앞뒤 공백을 제거합니다.

  정리된 지문(fingerprint)은 단일 라인이어야 하며 내부에 `-->`가 포함되어서는 안 됩니다. 그래야 4단계에서 복합 키를 재구성할 때 `dedup-key` 주석을 파싱할 수 있습니다. 새 발견 사항에 대한 지문을 계산할 때 이 정리를 적용하십시오. 기존 항목에서 다시 읽을 때는 파싱된 `evidence="..."` 값을 이미 정리된 것으로 간주하고 그대로 비교합니다.

추가되는 항목에 `suggested_fix`나 전체 `evidence` 배열을 포함하지 마십시오. 이러한 정보는 검토 실행 아티팩트(해당하는 경우)에 보관되며 문서의 Open Questions 섹션에는 포함되지 않습니다 — 항목은 나중에 돌아오는 독자를 위한 우려 사항 요약이지 전체 결정 패킷이 아닙니다. HTML 주석 `dedup-key` 라인은 신뢰할 수 있는 멱등성(idempotence)을 위해 필요한 최소한의 기계 중심 메타데이터이며, 재시도 시 마크다운 파서 없이도 파싱할 수 있도록 단순한 `key="value"` 형태의 단일 라인으로 구성됩니다.

### 4단계: 복합 키 충돌에 대한 멱등성 유지

동일한 `### From YYYY-MM-DD review` 하위 섹션 아래에 동일한 복합 키를 가진 항목이 이미 존재하는 경우, 중복해서 추가하지 않습니다. 이는 다음과 같은 경우에 발생할 수 있습니다:

- 동일한 검토 세션에서 워크스루 Defer 이후 `best-judgment-the-rest`를 통해 동일한 발견 사항을 두 번 Defer로 라우팅하는 경우 (드물지만 가능함)
- 부분 실패 후 오케스트레이터가 재시도하는 경우

**중복 제거를 위한 복합 키:** `normalize(section) + normalize(title) + evidence_fingerprint`. 이는 각 기존 항목의 `<!-- dedup-key: ... -->` HTML 주석에서 재구성됩니다 (3단계 항목 형식 참조). 추가하려는 새 발견 사항에 대해 발견 사항의 스키마 데이터에서 동일한 필드를 계산하고, 기존 항목에 대해서는 HTML 주석에서 파싱하여 세 필드가 모두 일치하는지 확인합니다.

- `normalize(section)` 및 `normalize(title)`은 합성(synthesis) 단계 3.3의 중복 제거와 동일한 정규화(소문자 변환, 문장 부호 제거, 공백 축소)를 사용합니다.
- `evidence_fingerprint`는 3단계에 따라 정리된(공백 축소, `-->` 및 `<!--` 제거, 따옴표 이스케이프) 첫 번째 증거 인용문의 앞부분 약 120자입니다. 결정 프라이머(decision primer)에서도 동일한 슬라이스가 사용됩니다 — `SKILL.md`의 "Decision primer" 섹션을 참조하십시오. 새 발견 사항에 증거가 없는 경우 section+title만으로 폴백합니다. 기존 항목의 HTML 주석에 `evidence=""`가 있는 경우 증거가 없는 항목으로 간주하고 비교 시 section+title로 폴백합니다. 기존 항목의 `dedup-key` 주석이 잘못된 경우(예: 정리 전 항목에서 줄바꿈이나 `-->` 시퀀스로 인해 주석이 여러 줄로 나뉜 경우), 부분 재구성을 시도하지 않고 아래의 레거시 폴백 규칙을 따릅니다.

제목만으로 중복을 제거하는 것은 충분하지 않습니다. 동일한 문서(심지어 동일한 검토 날짜) 내의 서로 다른 두 발견 사항이 섹션과 증거가 다른 경우 합법적으로 짧은 제목을 공유할 수 있습니다. `{title}`만 사용하면 그중 하나가 자동으로 누락되어 사용자에게 보이는 백로그 컨텍스트를 잃게 됩니다. 복합 키는 R29/R30 일치 조건(`section + title + evidence-substring overlap`)을 반영하므로 라운드 간 및 라운드 내 중복 제거가 일관되게 작동합니다.

**dedup-key 주석이 없는 레거시 항목:** 이 형식 이전에 작성된 항목(실제 환경에 남아 있는 경우)에는 HTML 주석이 없습니다. 4단계에서 이러한 항목을 만나면 해당 항목에 대해 제목 전용 비교로 폴백합니다 — 완벽하지는 않지만 중복 추가보다는 훨씬 낫습니다. 이는 레거시 데이터를 위한 하위 호환성 동작이며 권장되는 형식은 아닙니다.

충돌 발생 시, 사용자가 중복이 억제되었음을 알 수 있도록 완료 보고서의 Coverage 섹션에 해당 no-op을 기록합니다. 하위 섹션 간 충돌(동일한 복합 키, 다른 날짜)은 중복 제거되지 않습니다 — 각 검토는 동일한 우려 사항을 다시 제기할 수 있습니다.

---

## 동시 편집 안전성 (Concurrent edit safety)

문서 편집은 플랫폼의 편집 도구(Claude Code의 Edit 등)를 통해 이루어집니다. 추가 작업을 수행하기 전에 항상 디스크에서 문서를 다시 읽어 편집기 내 사용자의 동시 쓰기 충돌 가능성을 줄입니다. 이전 읽기와 추가 시도 사이에 문서의 mtime이나 내용이 예기치 않게 변경된 경우, 추가 작업을 중단하고 아래의 실패 경로를 통해 상황을 알립니다. 사용자가 검토 세션 중에 편집기에서 편집 중일 수 있으며, 동시 쓰기는 문서를 손상시킬 수 있습니다.

오케스트레이터는 영구적인 락(lock)을 유지하지 않고 가장 최근에 읽은 내용만 메모리에 보유합니다 — Interactive 검토에는 락 조정이 아니라 쓰기 전 관찰이 필요합니다.

---

## 실패 경로 (Failure path)

추가 작업을 완료할 수 없는 경우(디스크의 문서가 읽기 전용임, 경로가 잘못됨, 플랫폼의 편집 도구가 에러를 반환함, 동시 편집 충돌 감지 또는 기타 쓰기 실패), 플랫폼의 블로킹 질문 도구를 통해 다음 하위 질문과 함께 사용자에게 실패를 알립니다.

**질문:** `Couldn't append the finding to Open Questions. What should the agent do?`

**옵션 (정확히 세 개, 고정된 순서):**

```
A. Retry the append
B. Record the deferral in the completion report only (don't mutate the document)
C. Convert this finding to Skip
```

**처리:**

- **A Retry** — 추가 작업을 다시 시도합니다. 반복적으로 실패하면 동일한 하위 질문으로 돌아갑니다.
- **B Record only** — 문서 수정을 건너뛰고, 추가 작업이 실패했다는 메모와 함께 완료 보고서에 Deferred 작업을 기록합니다. 발견 사항이 문서에 기록되지는 않지만 사용자는 보고서에서 자신이 지연시켰음을 확인할 수 있습니다.
- **C Convert to Skip** — 설명 이유("append to Open Questions failed: <error>")와 함께 발견 사항을 Skip으로 기록합니다. 발견 사항은 세션의 나머지 부분 동안 작업 없음으로 처리됩니다.

알림 없는 실패는 허용되지 않습니다. 사용자가 하위 질문에 응답하지 않는 경우(세션 종료, 터미널 연결 끊김), 문서가 작성되지 않았더라도 메모리 내 결정 상태를 일관되게 유지하기 위해 옵션 B를 기본값으로 사용합니다.

---

## 상위 가용성 신호 (Upstream availability signal)

워크스루 및 일괄 미리보기는 Defer를 옵션으로 제공하기 전에 추가 가용성(append-availability)을 확인합니다. 문서를 작성할 수 없음을 알게 된 경우(예: 초기 읽기에서 읽기 전용 파일 시스템임을 확인), 오케스트레이터는 Phase 4 시작 시 `append_available: false` 신호를 캐시하고 워크스루 메뉴 및 라우팅 질문의 옵션 C에서 Defer를 억제합니다. 메뉴 동작은 `references/walkthrough.md`의 "Adaptations" 섹션을, 미리보기 동작은 `references/bulk-preview.md`의 "Edge cases" 섹션을 참조하십시오.

Phase 4 시작 시에는 추가 가용성이 true였으나 흐름 중간에 개별 추가 작업이 실패하는 경우, 위의 실패 경로가 특정 발견 사항을 처리합니다 — 이는 세션 레벨의 캐시된 신호를 전환하지 않습니다(실패가 일시적인 경우 다른 발견 사항은 여전히 성공적으로 추가될 수 있음).

---

## 추가된 내용 예시 (Example appended content)

시작 문서 상태:

```markdown
## Risks

...기존 내용...

## Deferred / Open Questions

### From 2026-04-10 review

- **Alias compatibility-theater concern** — Risks (P1, scope-guardian, confidence 75)

  The alias exists without documented external consumers...

  <!-- dedup-key: section="risks" title="alias compatibilitytheater concern" evidence="the alias exists without documented external consumers" -->

```

2026-04-18 세션에서 두 개의 발견 사항을 추가한 후:

```markdown
## Risks

...기존 내용...

## Deferred / Open Questions

### From 2026-04-10 review

- **Alias compatibility-theater concern** — Risks (P1, scope-guardian, confidence 75)

  The alias exists without documented external consumers...

  <!-- dedup-key: section="risks" title="alias compatibilitytheater concern" evidence="the alias exists without documented external consumers" -->

### From 2026-04-18 review

- **Unit 2/3 merge judgment call** — Scope Boundaries (P2, scope-guardian, confidence 75)

  The two units update consumer sites that deploy together. Splitting
  adds dependency tracking without enabling independent delivery.

  <!-- dedup-key: section="scope boundaries" title="unit 23 merge judgment call" evidence="the two units update consumer sites that deploy together" -->

- **Strawman alternatives on migration strategy** — Unit 3 Files (P2, coherence, confidence 75)

  The fix options list (a) through (c) as alternatives, but (b) and (c)
  are "accept the regression" framings that don't solve the problem the
  finding describes.

  <!-- dedup-key: section="unit 3 files" title="strawman alternatives on migration strategy" evidence="the fix options list a through c as alternatives but b and c" -->
```
