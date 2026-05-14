# Code Review: auto-version-bump hook

**날짜:** 2026-05-14
**대상:** `scripts/hooks/pre-bash-auto-version-bump.js`, `bash-hook-dispatcher.js`
**커밋:** 2f4f0f0

---

## 결론: MEDIUM 이슈 2건 — 수정 후 머지 권장

---

## MEDIUM

### M1. `execSync` 호출에 `stdio: 'pipe'` 누락

**위치:** `pre-bash-auto-version-bump.js` — `git add`, `git commit` 호출

git이 stdout/stderr로 예상치 못한 출력을 내보낼 경우(예: GPG 서명 프롬프트, 경고 메시지) 훅의 출력 스트림과 혼재될 수 있음.

```js
// 수정
execSync(`git add "${pluginJsonPath}" "${changelogPath}"`, { cwd: repoRoot, stdio: 'pipe' });
execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: repoRoot, stdio: 'pipe' });
```

### M2. `git log --format=%s`로 BREAKING CHANGE 본문 감지 불가

**위치:** `getCommitsSinceLastBump()`, `determineBumpType()`

`--format=%s`는 커밋 subject만 가져옴. Conventional Commits 스펙에서 `BREAKING CHANGE:`는 footer에 기록하는 경우가 많아 현재 로직으로는 감지 불가. `feat!:` / `fix!:` 형식만 확실히 작동함.

실질적 영향은 낮으나 `determineBumpType` 함수에 주석으로 명시 권장:
```js
// Note: BREAKING CHANGE in commit body/footer is not detected.
// Use feat!: or fix!: subject prefix for breaking changes.
```

---

## LOW

### L1. 훅에 `profiles` 미설정 — 모든 프로파일에서 실행

`pre:bash:auto-version-bump`에 `profiles` 필드가 없어 minimal/standard/strict 전체에서 실행됨. 의도적이라면 OK. 필요 시 `profiles: 'standard,strict'` 추가 가능.

### L2. 특수문자 포함 커밋 메시지 — CHANGELOG 그대로 삽입

커밋 메시지에 마크다운 특수문자가 포함된 경우 CHANGELOG에 이스케이프 없이 삽입됨. 현재 프로젝트 커밋 스타일에서는 문제 없음.

---

## 정상 확인

- `git push` 아닌 명령 → 완전 pass-through ✅
- 미릴리즈 커밋 없으면 skip ✅
- 예외 발생 시 push 차단 없이 경고 후 pass-through ✅
- `chore: bump version to` 커밋 분석 제외 — 루프 없음 ✅
- bump 타입 우선순위: major > minor > patch ✅
- CHANGELOG 항목 타입별 분류 (Breaking/Added/Fixed/Changed) ✅
- dispatcher 등록 위치: git-push-reminder 앞 ✅
