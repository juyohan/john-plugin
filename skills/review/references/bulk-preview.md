# 일괄 작업 미리보기 (Bulk Action Preview)

Interactive 모드 전용. 라우팅 옵션 C (File tickets) 실행 전 컴팩트 플랜 미리보기를 표시합니다. 최선의 판단 경로(옵션 B, Auto-resolve)는 미리보기 없이 즉시 실행.

---

## 미리보기 구조

작업별로 그룹화. 비어 있는 버킷 헤더는 생략.

```
<Path label> — <scope summary>:

Applying (N):
  [P0] <file>:<line> — <one-line plain-English summary>

Filing [TRACKER] tickets (N):
  [P1] <file>:<line> — <one-line plain-English summary>

Skipping (N):
  [P2] <file>:<line> — <one-line plain-English summary>

Acknowledging (N):
  [P3] <file>:<line> — <one-line plain-English summary>
```

옵션 C는 일괄 지연이므로 모든 발견 사항이 `Filing [TRACKER] tickets (N):` 버킷에 들어감. Apply / Skip / Acknowledge 버킷은 렌더링 안 함.

---

## 범위 요약 문구

- 옵션 C 헤더: `File plan — N findings as [TRACKER] tickets:`
- 트래커 신뢰도 낮거나 일반적인 경우: `Filing tickets (N):` (트래커 이름 생략)

---

## 발견 사항별 라인 형식

`[<severity>] <file>:<line> — <one-line summary>`

- `why_it_matters` 첫 문장 사용 (너무 길면 80자 내로 패러프레이징)
- `why_it_matters` 없으면 발견 사항 `title` 직접 사용
- Advisory 버킷 문구: "fix" 표현 사용 금지

---

## 질문 및 옵션

미리보기 렌더링 후 `AskUserQuestion`으로 질문. 미로드 상태면 `ToolSearch`로 즉시 로드. 차단 도구 없을 때만 번호 목록 폴백.

질문: `The agent is about to file the tickets above. Proceed?`

옵션:
- `Proceed` — 미리보기의 모든 티켓 생성
- `Cancel` — 아무 작업 없이 라우팅 질문으로 복귀

---

## Proceed / Cancel 의미론

**Proceed:** 모든 발견 사항을 tracker-defer 프로토콜로 라우팅. 수정 미적용. 완료 후 통합 완료 보고서 출력. 실패 시 tracker-defer 실패 경로 (Retry / Fallback / Skip) 인라인 표시.

**Cancel:** 라우팅 질문으로 복귀. 티켓 생성 없음, 상태 기록 없음. 캐시된 트래커 튜플은 유지.

---

## 엣지 케이스

- **N=1:** 미리보기 그대로 렌더링. Proceed / Cancel 동일 적용.
- **Sink 없음 (`any_sink_available = false`):** 업스트림에서 옵션 C 제공 안 됨. 일괄 미리보기 호출 안 됨.
