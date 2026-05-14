# Brainstorm: git push 자동 버전 bump 시스템

**날짜:** 2026-05-14
**대상:** `scripts/bump-version.sh` + `.claude/settings.json`

---

## 문제

`plugin.json`과 `CHANGELOG.md`의 버전을 수동으로 올려야 해서 push할 때마다 빠뜨리기 쉽다.
프로젝트 로컬에서만 동작하는 자동화가 필요하다.

---

## 요구사항

### R1. 트리거

`git push` 명령 실행 전, Claude Code PreToolUse 훅이 `scripts/bump-version.sh`를 자동 실행한다.
프로젝트 로컬 `.claude/settings.json`에 설정한다 — 글로벌 설정/스킬 등록 없음.

### R2. 버전 bump 타입 결정

마지막 버전 bump 커밋 이후의 커밋 메시지를 분석해 bump 타입을 결정한다:

| 커밋 타입 | bump |
|-----------|------|
| `feat:` / `feat!:` | minor (또는 major) |
| `BREAKING CHANGE` footer 또는 `!` suffix | major |
| 그 외 모든 타입 (`fix:`, `refactor:`, `chore:`, `docs:`, `test:` 등) | patch |

여러 타입이 혼재할 경우 우선순위: **major > minor > patch**

### R3. Skip 조건

다음 경우 bump 없이 원래 push를 그대로 진행한다:
- 마지막 버전 bump 커밋 이후 신규 커밋이 없는 경우

### R4. 업데이트 대상 파일

- `.claude-plugin/plugin.json` — `version` 필드
- `CHANGELOG.md` — 최상단에 새 버전 항목 추가 (커밋 목록 포함)

### R5. 자동 커밋

bump 완료 후 `chore: bump version to X.Y.Z` 메시지로 자동 커밋한다.
해당 커밋은 원래 push에 포함되어 함께 올라간다.

---

## 스코프 경계

**In:** `scripts/bump-version.sh` 신규 작성, `.claude/settings.json` 신규 작성
**Out:** `update.sh` 수정 없음, git tag 생성 없음, GitHub Release 없음

---

## 가정 (Assumptions)

- `chore: bump version to X.Y.Z` 패턴의 커밋은 분석 대상에서 제외 (무한 루프 방지)
- bump 커밋은 원래 push와 함께 전송 (별도 push 불필요)
- main 브랜치 단일 운영 — 브랜치 분기 처리 불필요
