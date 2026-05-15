# genie:setup Phase 0 확장 플랜

**날짜:** 2026-05-14
**상태:** 플랜 작성 완료 → 빌드 대기
**선행 플랜:** `docs/plans/2026/05/13-genie-setup-plan.md`

---

## 배경

기존 `genie:setup`은 프로젝트 초기화(스택 감지 → 문서 생성)에 집중되어 있었으나,
플러그인을 사용하기 위한 **환경 준비** 역할까지 포함하도록 확장한다.

추가 범위:
- 필수 CLI 도구 설치 여부 확인 및 자동 설치
- 플러그인 버전 확인 및 최신 상태 유지
- 현재 사용 가능한 스킬 목록 출력 (ce-setup의 check-health 스타일)
- 업데이트 발생 시 변경 내용(커밋 로그) 표시

**`scripts/check-health` 스크립트로 Phase 0 전체를 처리.** SKILL.md는 이 스크립트를
호출하고 종료 코드로 진행 여부를 결정한다. ce-setup의 check-health와 달리 이 스크립트는
능동적(active)으로 동작한다 — 도구 누락 시 자동 설치, 버전 오래된 경우 자동 업데이트.

---

## 결정 사항

| # | 결정 | 근거 |
|---|------|------|
| D1 | `gh`, `jq` 만 필수 도구로 지정 | 대부분의 스킬 동작에 필요, 나머지 도구(ast-grep 등)는 on-demand |
| D2 | 필수 도구 미설치 시 사용자 확인 없이 자동 설치 | 필수로 분류된 만큼 설치 여부를 묻지 않음 |
| D3 | 설치 실패 시 즉시 중단 | 도구 없이 이후 플로우가 동작하지 않음 |
| D4 | 버전 확인은 git remote와 HEAD 비교 | `update.sh`가 이미 git pull 방식이므로 동일 메커니즘 사용 |
| D5 | 플러그인 디렉토리 탐색: `~/.claude/agents/` 심볼릭 링크로 역추적 | install.sh가 심볼릭 링크를 생성하므로 안정적인 경로 탐색 가능 |
| D6 | 업데이트 실행은 `update.sh` 위임 | 기존 스크립트 재사용, 로직 중복 방지 |
| D7 | 버전 확인 실패 시 경고만 출력하고 계속 진행 | 네트워크 없는 환경 등 예외 상황 고려 |
| D8 | `scripts/check-health` 스크립트로 Phase 0 전체 처리 | 로직을 SKILL.md 밖으로 분리, 스크립트 단독 실행도 가능 |
| D9 | 스크립트는 active 방식 (설치 + 업데이트 포함) | ce-setup check-health(passive)와 달리 genie는 필수 도구를 자동 처리 |
| D10 | 스킬 목록은 `skills/` 디렉토리 스캔으로 동적 출력 | 하드코딩 없이 스킬 추가 시 자동 반영 |
| D11 | 업데이트 변경 내용은 git log로 표시 | CHANGELOG.md 파싱보다 단순하고 정확 |
| D12 | SKILL.md는 스크립트 호출 + 종료 코드로 진행 여부 결정 | 스크립트 실패(exit 1) 시 Phase 1 진입 차단 |

---

## 스코프 경계

**포함:**
- `scripts/check-health` 신규 작성 (Phase 0 전체 로직)
- `skills/setup/SKILL.md` 앞부분에 스크립트 호출 지시 추가
- 기존 Phase 1~4는 내용 변경 없음

**제외:**
- `agent-browser`, `vhs`, `silicon`, `ffmpeg`, `ast-grep` 등 선택적 도구 (on-demand 방식 유지)
- `update.sh` 스크립트 자체 수정
- `install.sh` 변경

---

## 구현 단위

### U0. `scripts/check-health` — 환경 확인 및 자동 설정 스크립트

**Touches:** `scripts/check-health` (신규)

스크립트 단독으로도 실행 가능 (`bash scripts/check-health`).
SKILL.md는 이 스크립트를 호출하고, exit code 1이면 Phase 1 진입을 차단한다.

**실행 흐름:**
1. 플러그인 버전 + 헤더 출력
2. 필수 도구 확인 → 누락 시 자동 설치
3. 스킬 목록 출력
4. 버전 확인 → 오래된 경우 자동 업데이트 + 변경 내용 표시
5. 정상 완료: exit 0 / 도구 설치 실패: exit 1

---

### U0a. Phase 0 — 필수 도구 확인 및 설치 (스크립트 내부)

**Touches:** `scripts/check-health` (U0의 일부)

**출력 형식 (정상):**

```
 Genie Plugin v1.3.1

 도구  2/2
  🟢  gh
  🟢  jq

 스킬  35/35
  🟢  backend       🟢  brainstorm    🟢  clean
  🟢  commit        🟢  design        🟢  doc-review
  🟢  fix           🟢  frontend      🟢  jpa
  🟢  learn         🟢  migrations    🟢  mysql
  🟢  nuxt          🟢  optimize      🟢  plan
  🟢  postgres      🟢  proof         🟢  push-pr
  🟢  redis         🟢  resolve-pr    🟢  review
  🟢  security      🟢  setup         🟢  simplify
  🟢  springboot    🟢  springboot-security  🟢  springboot-tdd
  🟢  standards     🟢  strategy      🟢  tdd
  🟢  think         🟢  vite          🟢  vue3
  🟢  work          🟢  worktree

 ✅ 최신 버전
```

**출력 형식 (도구 누락 + 설치 중):**

```
 Genie Plugin v1.3.1

 도구  1/2
  🟢  gh
  🟡  jq
       jq 설치 중... brew install jq
       ✅ jq 설치 완료

 스킬  35/35
  ...

 ✅ 최신 버전
```

**로직:**
1. 플러그인 버전: `.claude-plugin/plugin.json`의 `version` 필드 읽기
2. `command -v gh` 실행
   - 있으면: `🟢 gh`
   - 없으면: `🟡 gh` → `brew install gh`
     - `brew` 미존재 시: `❌ brew가 없습니다. https://brew.sh 에서 설치 후 다시 실행해주세요.` → 중단
     - 설치 성공: `✅ gh 설치 완료`
     - 설치 실패: `❌ gh 설치 실패. 수동으로 설치 후 다시 실행해주세요.` → 중단
3. `command -v jq` 동일 처리
4. 스킬 목록: `skills/` 디렉토리 하위 폴더 목록 스캔 → 전부 `🟢` 표시 (플러그인과 함께 자동 로드됨)

**완료 기준:**
- 두 도구 모두 설치된 상태로 Phase 0.5로 진입
- 설치 실패 시 에러 메시지와 함께 중단

---

### U0b. Phase 0.5 — 버전 확인 및 업데이트 (스크립트 내부)

**Touches:** `scripts/check-health` (U0의 일부, 도구 설치 성공 후 실행)

**플러그인 디렉토리 탐색 방법:**

`~/.claude/agents/` 디렉토리에 있는 심볼릭 링크를 읽어 원본 경로에서 플러그인 루트를 역추적한다.

```bash
# 심볼릭 링크 대상에서 agents/ 상위 디렉토리를 플러그인 루트로 추정
readlink ~/.claude/agents/<any-genie-agent>.md | xargs dirname | xargs dirname
```

탐색 실패 시 경고만 출력하고 Phase 1로 진행한다.

버전 확인 및 업데이트는 Phase 0의 출력 블록 안에서 처리된다.
(별도 출력 블록 없이 `✅ 최신 버전` 또는 업데이트 결과가 Phase 0 출력의 마지막 줄로 표시됨)

**업데이트 발생 시 출력 형식:**

```
 Genie Plugin v1.3.1 → v1.4.0

 도구  2/2
  🟢  gh
  🟢  jq

 스킬  35/35
  ...

 업데이트 완료

 변경 사항:
  · feat: genie:setup Phase 0 및 스킬 목록 추가
  · fix: tdd 커버리지 임계값 누락 수정
  · chore: bump version to 1.4.0
```

**로직:**
1. 플러그인 루트 탐색: `~/.claude/agents/` 심볼릭 링크 역추적
   - 실패 시: 버전 라인에 `⚠️ 버전 확인 불가 (경로 탐색 실패)` 표시 → Phase 1 진행
2. 업데이트 전 HEAD 저장: `OLD_HEAD=$(git -C <plugin_dir> rev-parse HEAD)`
3. `git -C <plugin_dir> fetch origin main --quiet`
   - 실패 시: `⚠️ 버전 확인 불가 (네트워크 오류)` 표시 → Phase 1 진행
4. HEAD vs origin/main 비교
   - 같으면: `✅ 최신 버전` → Phase 1 진행
   - 다르면: `update.sh` 실행 후 `git log <OLD_HEAD>..HEAD --oneline --pretty=format:"  · %s"` 출력

**완료 기준:**
- 최신인 경우: Phase 0 출력 마지막 줄에 `✅ 최신 버전` 표시
- 업데이트된 경우: 버전 범위(`v1.3.1 → v1.4.0`) + 커밋 목록 표시
- 실패 시: 경고 표시 후 중단 없이 Phase 1 진행

---

## 전체 플로우 (변경 후)

```
Phase 0     — 필수 도구 설치 (gh, jq)
    ↓
Phase 0.5   — 플러그인 버전 확인 및 업데이트
    ↓
Phase 1     — 스택 감지
    ↓
Phase 2     — 충돌 감지 및 확인
    ↓
Phase 3     — 불확실 항목 질문
    ↓
Phase 4     — 문서 생성
```

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| macOS 외 환경에서 brew 없음 | `brew` 미존재 시 수동 설치 링크 안내 후 중단 |
| 심볼릭 링크 탐색 실패 (install.sh 미실행) | 경고 표시 후 버전 확인 건너뜀 |
| git fetch 중 네트워크 타임아웃 | 실패 시 경고 표시 후 건너뜀 (중단 없음) |
| update.sh 실행 중 충돌 | update.sh 자체 에러 처리에 위임 |
| skills/ 디렉토리 스캔 시 SKILL.md 루트 파일 포함 오류 | 하위 디렉토리만 스캔 (파일 제외) |
| git log 출력이 너무 많은 경우 | 최대 10개 커밋만 표시, 초과 시 `  · ... 외 N개` |

---

### U0c. SKILL.md 스크립트 호출 지시 추가

**Touches:** `skills/setup/SKILL.md` (선두에 추가)

```
## Phase 0 — 환경 확인

`bash scripts/check-health`를 실행하십시오.
- exit 0: Phase 1로 진행
- exit 1: 에러 메시지 출력 후 중단
```

---

## 빌드 순서

```
U0  (scripts/check-health 신규 작성)
  ↓
U0c (SKILL.md 선두에 스크립트 호출 지시 추가)
  ↓
기존 U1~U5 유지 (변경 없음)
```

---

## 다음 단계

→ `/genie:work docs/plans/2026/05/14-genie-setup-phase0-extension.md`
