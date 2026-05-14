# Plan: git push 자동 버전 bump 시스템

**날짜:** 2026-05-14
**출처:** `docs/brainstorms/2026/05/14-auto-version-bump.md`

---

## 결정 사항

| 결정 | 근거 |
|------|------|
| JS 훅 파일로 구현 (`scripts/hooks/`) | 프로젝트가 이미 `bash-hook-dispatcher.js` 기반 JS 훅 시스템 사용 중 |
| `bash-hook-dispatcher.js`에 등록 | `.claude/settings.json` 신규 생성보다 기존 패턴에 일관성 있음 |
| 별도 `bump-version.sh` 없음 | JS 훅이 모든 로직 처리 — 파일 분리 불필요 |
| `chore: bump version to` 커밋 제외 | 분석 루프 방지 |

## 스코프 경계

**In:** `scripts/hooks/pre-bash-auto-version-bump.js` 신규, `bash-hook-dispatcher.js` 수정
**Out:** `update.sh`, `.claude/settings.json`, git tag, GitHub Release

---

## 구현 단위

- **U1. `scripts/hooks/pre-bash-auto-version-bump.js` 신규 작성**
  - 파일: `scripts/hooks/pre-bash-auto-version-bump.js`
  - `git push` 명령 감지 → 마지막 버전 bump 커밋 이후 커밋 수집
  - 커밋 타입 분석: `feat!` / `BREAKING CHANGE` → major, `feat` → minor, 나머지 → patch
  - 미릴리즈 커밋 없으면 pass-through (skip)
  - `.claude-plugin/plugin.json` version 필드 업데이트
  - `CHANGELOG.md` 최상단에 새 버전 항목 추가 (커밋 목록 포함)
  - `chore: bump version to X.Y.Z` 자동 커밋 후 pass-through
  - 기존 훅(`pre-bash-git-push-reminder.js`) 패턴 그대로 따름

- **U2. `bash-hook-dispatcher.js`에 훅 등록**
  - 파일: `scripts/hooks/bash-hook-dispatcher.js`
  - `require('./pre-bash-auto-version-bump')` import 추가
  - `PRE_BASH_HOOKS` 배열에 `id: 'pre:bash:auto-version-bump'` 항목 추가
  - `git-push-reminder` 훅 바로 앞에 위치 (bump 먼저, 알림 후)
  - 의존성: U1 완료 후

---

## 테스트 시나리오

**U1 완료 기준:**
- `feat:` 커밋 1개 → minor bump (`1.3.1 → 1.4.0`)
- `fix:` 커밋만 있음 → patch bump (`1.3.1 → 1.3.2`)
- `feat!:` 또는 `BREAKING CHANGE` → major bump (`1.3.1 → 2.0.0`)
- `feat:` + `fix:` 혼재 → minor 우선 (`1.3.1 → 1.4.0`)
- 버전 bump 이후 새 커밋 없음 → skip, pass-through
- `chore: bump version to` 커밋은 분석 대상 제외 확인

**U2 완료 기준:**
- `git push` 실행 시 훅이 트리거됨
- bump 완료 커밋이 push에 포함되어 함께 전송됨

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| 훅 실패 시 push 차단 | 예외 처리 → 오류 출력 후 pass-through (push 차단 안 함) |
| plugin.json 파싱 실패 | try-catch → 스킵 후 경고 출력 |
| CHANGELOG 형식 불일치 | 기존 항목 앞에 단순 삽입 — 파싱 불필요 |
