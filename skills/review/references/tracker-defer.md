# 트래커 감지 및 지연 실행 (Tracker Detection and Defer Execution)

Interactive 모드 라우팅 질문, 워크스루 Defer 옵션, 일괄 미리보기, 자율 호출자에서 로드됩니다.

---

## 실행 모드

**Interactive 모드 (기본값):** 사용자 대면 프롬프트 모두 실행 — 첫 번째 일반 레이블 Defer 시 트래커 선택 확인, 실패 시 Retry / Fall back / Convert to Skip 표시.

**Non-interactive 모드:** 차단 질문 없이 폴백 체인 조용히 실행. 체인 소진 시 `no_sink` 버킷 반환. 결과: `{ filed, failed, no_sink }`.

---

## 감지 (Detection)

`CLAUDE.md` / `AGENTS.md`에서 트래커 참조 읽기. 모호하면 `CONTRIBUTING.md`, `README.md`, `.github/` PR 템플릿 참조.

감지 출력 튜플: `{ tracker_name, confidence, named_sink_available, any_sink_available }`
- `confidence` — 문서에 명시적 명명 시 `high`, 그 외 `low`
- `named_sink_available` — 지정된 트래커를 실제로 호출 가능한 경우 `true`
- `any_sink_available` — 폴백 체인 어떤 티어라도 호출 가능한 경우 `true`. Defer 제공 여부 결정.

**프로브 타이밍:** 세션당 최대 한 번, Defer 직전에만. 캐시된 튜플 재사용.
`named_sink_available = true` → `any_sink_available = true` (추가 프로브 불필요).
그 외: `gh auth status` + `gh repo view --json hasIssuesEnabled` 성공 시 `any_sink_available = true`.

---

## 레이블 로직 (Interactive 모드)

- `confidence = high` + `named_sink_available = true`: 트래커 이름 직접 표시 (`Defer — file a Linear ticket`)
- `any_sink_available = true` + (confidence 낮거나 named_sink 없음): 일반 레이블 (`Defer — file a ticket`). 첫 번째 Defer 전 확인.
- `any_sink_available = false`: Defer 옵션 생략, 라우팅 질문 줄기에 이유 설명.

---

## 폴백 체인

순서 고정:
1. **지정된 트래커** (MCP / CLI / API)
2. **GitHub Issues (`gh`)** — `gh auth status` 성공 + 이슈 활성화 시
3. **Sink 없음** — Interactive: 보고서 잔존. Non-interactive: `no_sink` 반환.

---

## 티켓 구성

- **제목:** 발견 사항의 `title`
- **본문:** `why_it_matters` (아티팩트 조회, 불가 시 `title + severity + file + suggested_fix`) + `suggested_fix` + 증거 + 메타데이터 (`Severity`, `Confidence`, `Reviewer(s)`, `Finding ID`)
- **레이블:** `P0`–`P3` 심각도 태그
- **길이 초과 시:** 아티팩트 경로 포인터로 자름

---

## 실패 경로

**Interactive:** Retry / Fall back to next sink / Convert to Skip 차단 질문.

**Non-interactive:** 자동으로 다음 티어 진행 → `failed` 버킷 → `no_sink` 버킷.

지정된 트래커 실패 시 세션 동안 `named_sink_available = false` 캐싱. `any_sink_available`은 모든 티어 실패 확인 시에만 `false`.

---

## 트래커별 동작

| 트래커 | 인터페이스 | 비고 |
|---------|-----------|------|
| Linear | MCP 또는 API | 심각도 우선순위 필드 |
| GitHub Issues | `gh issue create` | `--label P0` 등, 실패 시 레이블 없는 이슈로 폴백 |
| Jira | MCP 또는 API | 심각도 우선순위 필드 |
| Sink 없음 | — | Interactive: 보고서 잔존, Non-interactive: `no_sink` |

Interactive 모드에서 `AskUserQuestion`이 미로드 상태면 `ToolSearch`로 즉시 로드. 차단 도구 없을 때만 번호 목록 폴백.
