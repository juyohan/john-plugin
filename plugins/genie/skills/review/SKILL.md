---
name: review
description: "계층화된 페르소나 에이전트, 신뢰도 기반 필터링, 머지/중복 제거 파이프라인을 사용한 구조화된 코드 리뷰입니다. PR을 생성하기 전에 코드 변경 사항을 검토할 때 사용합니다."
argument-hint: "[현재 브랜치를 리뷰하려면 공백으로 두거나, PR 링크를 제공하세요]"
allowed-tools:
  - gem
---
> **기본 가이드라인**: 이 스킬에는 [SKILL.md](../SKILL.md)가 적용됩니다.


# 코드 리뷰 (Code Review)

## 다중 에이전트 협업 (Multi-Agent Collaboration)

`--add gemini` (또는 `--add gem`) 플래그 감지 시: `gem` 도구로 초안 검토 요청, 결과 통합, 산출물 상단에 "Gemini와의 협업을 통해 검토 및 보완되었습니다." 추가.

동적으로 선택된 리뷰어 페르소나를 사용하여 코드 변경 사항을 리뷰합니다. 구조화된 JSON을 반환하는 병렬 서브 에이전트를 실행한 후, 발견된 사항들을 단일 보고서로 머지하고 중복을 제거합니다.

## 사용 시점

- PR을 생성하기 전
- 반복적인 구현 중 작업을 완료한 후
- 코드 변경 사항에 대한 피드백이 필요할 때
- 독립적으로 호출 가능
- 더 큰 워크플로우 내에서 읽기 전용 또는 autofix 리뷰 단계로 실행 가능

## 인자 파싱 (Argument Parsing)

`$ARGUMENTS`에서 다음 선택적 토큰들을 파싱합니다. 인식된 각 토큰을 제거한 후 나머지를 PR 번호, GitHub URL 또는 브랜치 이름으로 해석합니다.

| 토큰 | 예시 | 효과 |
|-------|---------|--------|
| `mode:autofix` | `mode:autofix` | autofix 모드 선택 |
| `mode:report-only` | `mode:report-only` | report-only 모드 선택 |
| `mode:headless` | `mode:headless` | headless 모드 선택 |
| `base:<sha-or-ref>` | `base:abc1234` 또는 `base:origin/main` | 범위 감지 건너뛰기 — 직접 diff 베이스로 사용 |
| `plan:<path>` | `plan:docs/plans/2026-03-25-001-feat-foo-plan.md` | 요구사항 검증을 위해 이 플랜을 로드 |

모든 토큰은 선택 사항입니다. **충돌하는 모드 플래그:** 여러 모드 토큰이 있으면 중단합니다. `mode:headless` 충돌 시 `Review failed (headless mode). Reason: conflicting mode flags — <mode_a> and <mode_b> cannot be combined.`, 그렇지 않으면 일반 형식 출력.

## 빠른 리뷰 단축 경로 (Quick Review Short-Circuit)

`$ARGUMENTS`가 빠른/가벼운 리뷰를 나타내면 멀티 에이전트 흐름을 할당하지 않습니다. 진행 전 **선택된 경로를 안내**합니다. 프로그래밍 방식 호출자(`mode:autofix`, `mode:report-only`, `mode:headless`)는 이 안내를 건너뜁니다.

1. **도구의 내장 코드 리뷰를 실행합니다.** Claude Code: `/review [대상]`. Gemini: 빠른 코드 리뷰 실행. 그 후 중단. 멀티 에이전트 파이프라인 할당하지 않습니다.
2. **예외:** 내장 코드 리뷰가 없으면 단축 경로 없이 전체 멀티 에이전트 리뷰 진행.
3. **프로그래밍 방식 호출자는 이 단축 경로를 우회합니다.**

## 모드 감지 (Mode Detection)

| 모드 | 조건 | 동작 |
|------|------|----------|
| **Interactive** (기본값) | 모드 토큰 없음 | 리뷰, `safe_auto` 수정 자동 적용, 발견 사항 제시, 정책 결정 요청 |
| **Autofix** | `mode:autofix` | 상호작용 없음. `safe_auto`만 적용, 재리뷰, 잔여 작업 결과물 작성 |
| **Report-only** | `mode:report-only` | 엄격한 읽기 전용. 수정/결과물/커밋/푸시/PR 없음 |
| **Headless** | `mode:headless` | `safe_auto` 조용히 적용(단일 패스), 나머지 구조화된 출력, 결과물 작성, "Review complete" 반환 |

### Autofix 모드 규칙

- 질문 없음. `safe_auto -> review-fixer`만 적용. `gated_auto`/`manual`/`human`/`release`는 미해결.
- `/tmp/compound-engineering/review/<run-id>/`에 결과물 작성 (발견 사항, 수정 사항, 잔여 작업, 자문 출력).
- 잔여 요약 반환: 고정 `#`, 심각도, file:line, 제목, `autofix_class`. 잔여 없으면 `Residual actionable work: none.`
- 커밋/푸시/PR 없음.

### Report-only 모드 규칙

- 질문 없음. 파일 수정/결과물/티켓/커밋/푸시/PR 없음.
- 공유 체크아웃 전환 불가. PR/브랜치 대상 지정 시 중단 (사유 출력).
- 브라우저 테스트와 동시 실행 가능한 유일한 모드.

### Headless 모드 규칙

- 질문 없음 (모든 차단 도구 사용 금지). diff 범위 결정 불가 시: `Review failed (headless mode). Reason: no diff scope detected. Re-invoke with a branch name, PR number, or base:<ref>.`
- `safe_auto -> review-fixer`만 단일 패스 적용. 나머지는 구조화된 텍스트 출력으로 반환.
- 결과물 작성. 티켓/외부화 없음. 공유 체크아웃 전환 불가 (시도 시: `Review failed (headless mode). Reason: cannot switch shared checkout. Re-invoke with base:<ref>...`).
- 커밋/푸시/PR 없음. 마지막에 "Review complete" 출력.

### Interactive 모드 규칙

- 첫 질문 전 `ToolSearch`로 `select:AskUserQuestion` 한 번 사전 로드. (Claude Code 전용; Codex/Gemini/Pi 불필요.)
- 번호 목록 폴백은 도구가 실제로 없을 때만 — 스키마 로드 대기 중은 폴백 트리거가 아님.

## 심각도 척도 (Severity Scale)

| 레벨 | 의미 | 조치 |
|-------|---------|--------|
| **P0** | 치명적인 파손, 악용 가능한 취약점, 데이터 손실/손상 | 머지 전 반드시 수정 |
| **P1** | 일반적인 사용 시 발생 가능성이 높은 영향력 큰 결함, 계약 위반 | 수정 권장 |
| **P2** | 의미 있는 부작용이 있는 보통 수준의 문제 (엣지 케이스, 성능 저하, 유지보수 함정) | 간단한 경우 수정 |
| **P3** | 영향력이 낮고 범위가 좁으며 사소한 개선 사항 | 사용자 재량 |

## 작업 라우팅 (Action Routing)

심각도는 **긴급성**을, 라우팅은 **누가 다음에 행동할지**를 나타냅니다.

| `autofix_class` | 기본 소유자 | 의미 |
|-----------------|------------|------|
| `safe_auto` | `review-fixer` | 국부적·결정론적. API/계약/보안/권한 변경 없음 |
| `gated_auto` | `downstream-resolver` 또는 `human` | 구체적 수정이 있지만 계약/권한/경계를 변경 — 기본 자동 적용 금지 |
| `manual` | `downstream-resolver` 또는 `human` | 외부로 전달해야 하는 실행 가능 작업 |
| `advisory` | `human` or `release` | 학습 내용, 배포 노트 등 보고 전용 출력 |

라우팅 규칙:
- 최종 경로는 Synthesis 단계에서 결정합니다.
- **review-fixer**: Step 3에서 할당하는 수정 도구 서브 에이전트를 가리키는 라우팅 레이블.
- 의견 불일치 시 더 보수적인 경로를 선택합니다.
- `safe_auto -> review-fixer`만 스킬 내 수정 큐에 자동으로 들어갑니다.
- `requires_verification: true`는 타겟 테스트/집중 재리뷰 없이는 수정 완료가 아님을 의미합니다.

## 리뷰어 (Reviewers)

전체 카탈로그는 아래에 포함된 페르소나 카탈로그를 참조하십시오.

**항상 활성화 (모든 리뷰):**

| 에이전트 | 중점 사항 |
|-------|-------|
| `genie:review-correctness` | 로직 에러, 엣지 케이스, 상태 버그, 에러 전파 |
| `genie:review-testing` | 테스트 커버리지 공백, 약한 단언문, 취약한 테스트 |
| `genie:review-maintainability` | 결합도, 복잡성, 네이밍, 데드 코드, 추상화 부채 |
| `code-reviewer` | CLAUDE.md 및 AGENTS.md 준수 여부 |
| `code-reviewer` | 새 기능의 에이전트 접근성 검증 |
| `code-explorer` | `docs/solutions/`에서 관련 과거 이슈 검색 |

**교차 조건부 (diff에 따라 선택):**

| 에이전트 | 선택 조건 |
|-------|---------|
| `genie:security` | 인증, 공용 엔드포인트, 사용자 입력, 권한 |
| `genie:perf` | DB 쿼리, 데이터 변환, 캐싱, 비동기 |
| `code-reviewer` | 라우트, 직렬화 도구, 타입 시그니처, 버저닝 |
| `database-reviewer` | 마이그레이션, 스키마 변경, 백필 |
| `silent-failure-hunter` | 에러 핸들링, 재시도, 타임아웃, 백그라운드 작업 |
| `genie:review-adversarial` | 테스트/lock파일 제외 50줄 이상, 또는 인증/결제/데이터 수정/외부 API |
| `pr-test-analyzer` | 기존 리뷰 코멘트가 있는 PR |

**스택 전용 조건부:**

| 에이전트 | 선택 조건 |
|-------|---------|
| `genie:py` | Python 모듈, 엔드포인트, 스크립트, 서비스 |
| `genie:ts` | TypeScript/JavaScript 컴포넌트, 서비스, 훅, 유틸리티, 공유 타입 |
| `genie:swift` | Swift 파일, SwiftUI, UIKit, SPM, Core Data, .pbxproj |
| `genie:go` | Go 서비스, CLI, 패키지 |
| `genie:java` | Java/Spring Boot 서비스, 컨트롤러, 레포지토리 |
| `genie:kotlin` | Kotlin/Android 컴포넌트, ViewModel, Compose |

**CE 조건부 (마이그레이션 전용):**

| 에이전트 | 선택 조건 |
|-------|---------|
| `database-reviewer` | DB 스키마, 마이그레이션 파일, 드리프트 감지, 배포 체크리스트 |

## 리뷰 범위 (Review Scope)

4명 '항상 활성화' + 2명 CE '항상 활성화' 자동 할당. diff에 맞는 교차/스택 전용 추가. 소규모 설정 변경 = 6명, 복잡한 기능 = 최대 10명.

## 보호된 결과물 (Protected Artifacts)

어떤 리뷰어도 삭제/제거/gitignore 대상으로 지정해서는 안 됩니다:

- `docs/brainstorms/**/*`
- `docs/plans/**/*.md`
- `docs/solutions/*.md`

Synthesis 단계에서 이 파일을 대상으로 한 발견 사항을 폐기하십시오.

## 실행 방법

### Stage 1: 범위 결정 (Determine scope)

**`base:` 인자가 제공된 경우 (빠른 경로):**

```
BASE_ARG="{base_arg}"
BASE=$(git merge-base HEAD "$BASE_ARG" 2>/dev/null) || BASE="$BASE_ARG"
```

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

자동화된 호출자는 이 방식을 선호합니다. `base:`를 PR 번호/브랜치 대상과 함께 사용하지 마십시오 — 에러 출력 후 중단.

**PR 번호 또는 GitHub URL이 제공된 경우:**

`mode:report-only`/`mode:headless`에서 공유 체크아웃의 `gh pr checkout` 실행 금지. 격리된 체크아웃이 아니면 중단.

건너뛰기 조건 사전 확인:

```
gh pr view <number-or-url> --json state,title,body,files
```

- `state`가 `CLOSED`/`MERGED` → 중단.
- 사소한 PR 판단: 가벼운 서브 에이전트로 lock파일/버전 업데이트 전용 여부 확인. '예' → 중단. Draft는 정상 리뷰.

Worktree 깨끗한지 확인 후 체크아웃:

```
git status --porcelain
gh pr checkout <number-or-url>
```

PR 메타데이터 (`hasPriorComments` 포함, 승인 전용 리뷰 제외):

```
gh pr view <number-or-url> --json title,body,baseRefName,headRefName,url,reviews,comments --jq '{title, body, baseRefName, headRefName, url, hasPriorComments: ((.reviews | map(select(.state != "APPROVED" or .body != "")) | length) > 0 or (.comments | length) > 0)}'
```

PR 베이스 브랜치와 비교한 로컬 diff:

```
PR_BASE_REMOTE=$(git remote -v | awk 'index($2, "github.com:<base-repo>") || index($2, "github.com/<base-repo>") {print $1; exit}')
if [ -n "$PR_BASE_REMOTE" ]; then PR_BASE_REMOTE_REF="$PR_BASE_REMOTE/<base>"; else PR_BASE_REMOTE_REF=""; fi
PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
if [ -z "$PR_BASE_REF" ]; then
  if [ -n "$PR_BASE_REMOTE_REF" ]; then
    git fetch --no-tags "$PR_BASE_REMOTE" <base>:refs/remotes/"$PR_BASE_REMOTE"/<base> 2>/dev/null || git fetch --no-tags "$PR_BASE_REMOTE" <base> 2>/dev/null || true
    PR_BASE_REF=$(git rev-parse --verify "$PR_BASE_REMOTE_REF" 2>/dev/null || git rev-parse --verify <base> 2>/dev/null || true)
  else
    if git fetch --no-tags https://github.com/<base-repo>.git <base> 2>/dev/null; then
      PR_BASE_REF=$(git rev-parse --verify FETCH_HEAD 2>/dev/null || true)
    fi
    if [ -z "$PR_BASE_REF" ]; then PR_BASE_REF=$(git rev-parse --verify <base> 2>/dev/null || true); fi
  fi
fi
if [ -n "$PR_BASE_REF" ]; then BASE=$(git merge-base HEAD "$PR_BASE_REF" 2>/dev/null) || BASE=""; else BASE=""; fi
```

```
if [ -n "$BASE" ]; then echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard; else echo "ERROR: Unable to resolve PR base branch <base> locally."; fi
```

base ref 확인 실패 시 `git diff HEAD`로 폴백하지 말고 중단.

**브랜치 이름이 제공된 경우:**

`mode:report-only`/`mode:headless`에서 공유 체크아웃의 `git checkout <branch>` 금지. Worktree 깨끗한지 확인 후 체크아웃:

```
git status --porcelain
git checkout <branch>
```

베이스 감지 및 merge-base 계산:

```
RESOLVE_OUT=$(bash scripts/resolve-base.sh) || { echo "ERROR: resolve-base.sh failed"; exit 1; }
if [ -z "$RESOLVE_OUT" ] || echo "$RESOLVE_OUT" | grep -q '^ERROR:'; then echo "${RESOLVE_OUT:-ERROR: resolve-base.sh produced no output}"; exit 1; fi
BASE=$(echo "$RESOLVE_OUT" | sed 's/^BASE://')
```

diff 생성:

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

에러 시 `git diff HEAD`로 폴백하지 말고 중단. `gh pr view`로 PR 메타데이터 조회 (없으면 `hasPriorComments=false`).

**인자가 없는 경우 (현재 브랜치):**

브랜치 모드와 동일한 `scripts/resolve-base.sh`로 BASE 결정 후 diff 생성. 에러 시 중단.

**추적되지 않은 파일 처리:** `UNTRACKED:` 목록이 비어있지 않으면 제외된 파일 알림. 검토 필요 파일이 있으면 `git add` 후 재실행 요청. `mode:headless`/`mode:autofix`에서는 추적된 변경 사항으로만 진행, Coverage에 기록.

### Stage 2: 의도 파악 (Intent discovery)

**PR/URL 모드:** PR 제목, 본문, 연결된 이슈 사용. 빈약한 경우 커밋 메시지로 보강.

**브랜치 모드:** `git log --oneline ${BASE}..<branch>` 실행.

**독립형:** `git rev-parse --abbrev-ref HEAD` + `git log --oneline ${BASE}..HEAD`

2~3줄 의도 요약 작성. 모든 리뷰어 할당 프롬프트에 전달. 의도는 어떤 리뷰어를 선택할지가 아닌 *각 리뷰어가 얼마나 꼼꼼히 살펴볼지*를 결정합니다.

**의도가 모호할 때:**
- **Interactive:** `AskUserQuestion`으로 한 가지 질문. 미로드 시 먼저 `ToolSearch select:AskUserQuestion` 호출.
- **기타 모드:** 보수적으로 추론. Coverage에 불확실성 기록.

### Stage 2b: 플랜 탐색 (Plan discovery)

다음 소스를 우선순위대로 확인:

1. `plan:` 인자 → `plan_source: explicit`
2. PR 본문에서 `docs/plans/**/*.md` 패턴 스캔 → 하나면 `explicit`, 여러 개/모호 → `inferred`
3. 브랜치 이름 키워드로 `docs/plans/**/*` glob → 정확히 하나이면 `inferred`. 여러 개/일반 키워드 → 건너뜀

플랜을 찾으면 Requirements(R-ID) + 구현 단위(U-ID) 읽어 Stage 6용으로 저장. 플랜 없어도 리뷰 중단 금지.

### Stage 3: 리뷰어 선택 (Select reviewers)

4명 '항상 활성화' + 2명 CE '항상 활성화' 자동 선택. 교차/스택 전용은 키워드 매칭이 아닌 에이전트 판단으로 선택.

**파일 타입 인지:** 지침 산문 파일(Markdown 스킬, JSON 스키마, 설정 파일)만 변경 시 Adversarial 리뷰어 건너뜀 (인증/결제/데이터 수정 동작 설명 제외). 줄 수 임계값 계산 시 실행 가능 코드 줄만 계산.

**`previous-comments`:** Stage 1에서 PR 메타데이터 수집 + `hasPriorComments: true`일 때만 선택.

에이전트 할당 전 팀 구성 안내 (진행 상황 보고, 차단 확인 단계 아님).

### Stage 3b: 프로젝트 표준 경로 탐색

서브 에이전트 할당 전:

1. Glob으로 `**/CLAUDE.md` 및 `**/AGENTS.md` 검색.
2. 변경된 파일의 조상 디렉토리에 있는 파일로 필터링.

경로 목록을 `project-standards` 프롬프트의 `<standards-paths>` 블록에 전달.

### Stage 4: 서브 에이전트 할당 (Spawn sub-agents)

#### 모델 계층화

`genie:review-correctness`, `genie:security`, `genie:review-adversarial`: 세션 모델 상속. 나머지: mid-tier 모델 (Claude Code: `model: "sonnet"`). 잘못된 이름으로 할당 실패하는 것보다 부모 모델로 실행이 낫습니다.

#### 실행 ID

```bash
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' ')
mkdir -p "/tmp/compound-engineering/review/$RUN_ID"
```

**Report-only 모드:** 실행 ID 생성 및 디렉토리 생성 건너뜀.

#### 할당

`mode` 파라미터 생략. 제한된 병렬 할당 — 큐에 넣고 슬롯이 비면 채움. 용량 문제는 리뷰어 실패가 아닌 배압으로 처리.

아래 포함된 서브 에이전트 템플릿으로 각 페르소나 리뷰어 할당. 각 서브 에이전트 수신:

1. 페르소나 파일 내용
2. diff 범위 규칙
3. JSON 출력 계약
4. PR 메타데이터 (PR 리뷰 시)
5. 의도 요약, 파일 목록, diff
6. 실행 ID 및 리뷰어 이름
7. `project-standards` 전용: `<standards-paths>` 블록

서브 에이전트는 프로젝트에 **읽기 전용** (non-mutating). `git diff`/`git blame`/`gh pr view` 등 읽기 전용 명령은 허용. 결과물 경로 외 쓰기 금지.

압축된 JSON 반환 (머지 단계 필드):

```json
{
  "reviewer": "security",
  "findings": [{
    "title": "...", "severity": "P0", "file": "...", "line": 42,
    "confidence": 100, "autofix_class": "gated_auto", "owner": "downstream-resolver",
    "requires_verification": true, "pre_existing": false, "suggested_fix": "..."
  }],
  "residual_risks": [...],
  "testing_gaps": [...]
}
```

상세 필드(`why_it_matters`, `evidence`)는 결과물 파일에만. `suggested_fix`는 두 계층 모두에 포함.

**CE 항상 활성화 에이전트** (`code-reviewer` (접근성), `code-explorer` (학습 검색)): 동일 스케줄러로 할당. 동일한 리뷰 컨텍스트 번들 제공. 비구조화된 출력은 Stage 6에서 별도 종합.

**CE 조건부 에이전트** (`database-reviewer`): 마이그레이션 포함 시 할당. 리뷰 베이스 브랜치를 명시적 전달 (`main` 가정 금지).

### Stage 5: 발견 사항 병합 (Merge findings)

1. **검증.** 필수 필드/타입/값 제약 확인. 잘못된 형식 폐기.
   - severity: P0|P1|P2|P3, autofix_class: safe_auto|gated_auto|manual|advisory
   - owner: review-fixer|downstream-resolver|human|release
   - confidence: {0,25,50,75,100}, line: 양의 정수, pre_existing/requires_verification: 불리언

2. **중복 제거.** 지문 = `normalize(file) + line_bucket(line,+/-3) + normalize(title)`. 일치 시 최고 심각도/앵커 유지, 리뷰어 기록. 앵커 50 포함 전체 세트에서 실행.

3. **교차 리뷰어 합의.** 2명 이상이 동일 발견 사항 → 앵커 한 단계 상승 (50→75, 75→100, 100→100). Reviewer 열에 기록.

4. **기존 존재 사항 분리.** `pre_existing: true` → 별도 리스트.

5. **의견 불일치 해결.** Reviewer 열에 불일치 주석 (예: "security (P0), correctness (P1) -- kept P0").

6. **라우팅 정규화.** 최종 `autofix_class`/owner/`requires_verification` 설정. 더 보수적인 경로 유지.

6b. **권장 조치 도출.**

| `autofix_class` | `suggested_fix` | 권장 조치 |
|-----------------|-----------------|-----------|
| `safe_auto` | — | Apply |
| `gated_auto` | 있음 | Apply |
| `gated_auto` | 없음 | Defer |
| `manual` | **있음** | **Apply** |
| `manual` | 없음 | Defer |
| `advisory` | — | Acknowledge |

교차 리뷰어 동점 처리: `Skip > Defer > Apply > Acknowledge` 순서.

6c. **모드 인식 격하.** 조건: P2/P3 + `advisory` + 기여 리뷰어가 testing/maintainability만.
- Interactive/report-only: 기본 세트에서 제거. testing → `testing_gaps`, maintainability → `residual_risks`. Coverage에 기록.
- Headless/autofix: 완전 억제. Coverage에 기록.

7. **신뢰도 게이트.** 앵커 75 미만 억제. 예외: P0 + 앵커 50 이상은 통과. 앵커별 억제 개수 기록.

8. **작업 파티셔닝.** in-skill fixer queue (`safe_auto -> review-fixer`) / residual actionable queue (`downstream-resolver`) / report-only queue (`advisory` + `human`/`release`).

9. **정렬 및 번호 매기기.** P0→P1→P2→P3, 앵커 내림차순, 파일 경로, 줄 번호 순. 전체 세트에 단조 증가 `#` 할당. 섹션이 바뀌어도 번호 재사용 — 재매기기 금지.

10. **커버리지 데이터 수집.** 전체 리뷰어의 `residual_risks` + `testing_gaps` 합산.

11. **CE 에이전트 결과물 보존.** learnings/agent-native/schema-drift/deployment-verification 출력물 유지. 스키마 불일치를 이유로 비구조화 출력 버리지 말 것.

### Stage 5b: 검증 패스 (외부화 모드 전용)

`references/validator-template.md`로 생존한 발견 사항별 검증자 서브 에이전트 할당.

**실행 시점:**

| 모드 | 실행 여부 |
|------|---------|
| `headless`, `autofix` | 예 (Stage 5~6 사이) |
| interactive 워크스루 | 아니오 (사용자가 검증자) |
| interactive 베스트 저지먼트 | 아니오 (수정 도구 결과가 검증) |
| interactive 티켓 생성 (C) | 예 (트래커 할당 전) |
| interactive 보고 전용 (D), report-only | 아니오 |

> Option A/B에서 `requires_verification: true` 항목 검증은 Stage 5b가 아닌 Step 3 수정 도구(review-fixer)에서 수행.

**단계:**

1. 발견 사항 선택 (headless/autofix: 모두; 옵션 C: 대기 중인 모두).
2. 15개 초과 시 P0 우선 상위 15개만 검증. Coverage에 초과 폐기 수 기록.
3. 발견 사항별 검증자 서브 에이전트 할당 (제한된 병렬). mid-tier 모델. 읽기 전용.
4. `{ "validated": true/false, "reason": "..." }` 수집. false/실패 → 폐기 + Coverage 기록.

### Stage 6: 종합 및 제시 (Synthesize and present)

아래 포함된 리뷰 출력 템플릿의 **파이프 구분 마크다운 테이블**을 사용합니다. 발견 사항을 자유 형식 텍스트/가로줄 산문으로 렌더링하지 마십시오.

1. **헤더.** 범위, 의도, 모드, 조건부 근거가 포함된 리뷰어 팀.
2. **발견 사항.** `### P0 -- Critical` ~ `### P3 -- Low`으로 심각도 그룹화. `#`, 파일, 이슈, 리뷰어, 신뢰도, 경로 포함. 빈 레벨 생략.
3. **요구사항 완료 여부.** Stage 2b에서 플랜이 발견된 경우에만. `explicit`: 미충족 → P1 발견 사항. `inferred`: P3 advisory. 플랜 없으면 섹션 생략.
4. **적용된 수정 사항.** 수정 단계 실행 시만.
5. **잔여 실행 가능 작업.** 미해결 실행 가능 발견 사항이 있을 때.
6. **기존 존재 사항.** 별도 섹션. Verdict 미합산.
7. **학습 내용 및 과거 솔루션.** `code-explorer` 결과.
8. **에이전트 접근성 공백.** `code-reviewer` 결과. 없으면 생략.
9. **스키마 드리프트 확인.** `database-reviewer` 실행 시.
10. **배포 노트.** `database-reviewer` 실행 시. 실행 가능하게 유지.
11. **커버리지.** 앵커별 억제 개수, 격하/억제 개수, 검증자 폐기, 잔여 위험, 테스트 공백, 실패 리뷰어.
12. **평결.** Ready to merge / Ready with fixes / Not ready. 수정 순서 포함. `explicit` 플랜 누락 요구사항 → "Not ready". `inferred` 누락 → 근거에 기록, 차단 안 함.

시간 추정치 포함 금지. **형식 검증:** 발견 사항이 자유 형식 텍스트면 중단, 테이블로 재구성.

### Headless 출력 형식

```
Code review complete (headless mode).

Scope: <scope-line>
Intent: <intent-summary>
Reviewers: <reviewer-list with conditional justifications>
Verdict: <Ready to merge | Ready with fixes | Not ready>
Artifact: /tmp/compound-engineering/review/<run-id>/

Applied N safe_auto fixes.

Gated-auto findings (concrete fix, changes behavior/contracts):

[P1][gated_auto -> downstream-resolver][needs-verification] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">
  Evidence: <evidence[0]>

Manual findings (actionable, needs handoff):

[P1][manual -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Advisory findings (report-only):

[P2][advisory -> human] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Pre-existing issues:
[P2][gated_auto -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Residual risks:
- <risk>

Learnings & Past Solutions:
- <learning>

Agent-Native Gaps:
- <gap description>

Schema Drift Check:
- <drift status>

Deployment Notes:
- <deployment note>

Testing gaps:
- <gap>

Coverage:
- Suppressed: <N> findings below anchor 75 (P0 at anchor 50+ retained)
- Mode-aware demotion suppressions: <N>
- Validator drops: <N> findings rejected by Stage 5b validator
  - <file:line> -- <reason>
- Validator over-budget drops: <N>
- Failed reviewers: <reviewer>

Review complete
```

**상세 정보 보강:** `Why:`/`Evidence:` → 결과물 파일에서 로드. `Suggested fix:` → 압축 반환값에서 직접. 매칭: `file + line_bucket(line,+/-3)`, 제목으로 타이브레이크. 일치 없으면 해당 줄 생략 + Coverage 기록.

**형식 규칙:** `[needs-verification]`은 `requires_verification: true`인 발견 사항에만. `owner: release` → Advisory 섹션. `pre_existing: true` → Pre-existing 섹션. 0개 항목 섹션 생략. 모든 리뷰어 실패 시 `Code review degraded (headless mode). Reason: 0 of N reviewers returned results.` 후 "Review complete".

## 품질 게이트 (Quality Gates)

1. **모든 발견 사항은 실행 가능해야 합니다.** "고려하십시오"/"~할 수 있습니다" → 구체적 조치로 재작성.
2. **훑어보기 위양성이 없어야 합니다.** 주변 코드 실제로 읽었는지 확인.
3. **심각도가 적절히 보정되어야 합니다.** 스타일 지적은 P0 불가. SQL 인젝션은 P3 불가.
4. **줄 번호가 정확해야 합니다.** 파일 내용과 대조.
5. **보호된 결과물이 존중되어야 합니다.** `docs/brainstorms/`/`docs/plans/`/`docs/solutions/` 삭제/gitignore 발견 사항 폐기.
6. **린터 출력과 중복되지 않아야 합니다.** 시맨틱 이슈에 집중.

## 언어 인지 조건부 (Language-Aware Conditionals)

스택 전용 리뷰어는 파일 확장자가 아닌 해당 스택에서의 의미 있는 동작/아키텍처/UI 상태 변경으로 트리거됩니다. 일반 언어 검사기가 아닌 고유 관점을 추가합니다.

## 리뷰 후 (After Review)

### Step 1: 조치 세트 구축

- **깨끗한 리뷰:** 발견 사항 0개 → 수정/전달 단계 건너뜀.
- **수정 도구 큐:** `safe_auto -> review-fixer` 발견 사항.
- **잔여 실행 가능 큐:** `downstream-resolver` 소유의 미해결 `gated_auto`/`manual`.
- **보고 전용 큐:** `advisory` + `human`/`release` 소유 출력물.
- 자문 전용 출력을 수정 작업이나 티켓으로 변환하지 마십시오.

### Step 2: 모드별 정책

**Interactive 모드**

`safe_auto -> review-fixer` 발견 사항을 묻지 않고 자동 적용.

**잔여 사항 없음 케이스:** `safe_auto` 후 `gated_auto`/`manual`이 없으면 라우팅 질문 건너뜀. 완료 요약 출력 후 Step 5 게이팅 규칙에 따라 진행.

**P0/P1 자동 루프백:** `safe_auto` 적용 후 `gated_auto`/`manual` **P0 또는 P1** 발견 사항이 남아 있으면 라우팅 질문을 건너뜁니다. 대신 자동으로 plan을 갱신하고 루프를 안내합니다:

1. **Plan 파일 갱신**: Stage 2b에서 발견된 plan 파일을 읽어 마지막 U-ID를 파악한 뒤, `## Review Pass N — Fix Units` 섹션을 파일 끝에 추가합니다. plan이 없으면 `docs/plans/YYYY/MM/DD-NNN-fix-<브랜치명>-plan.md`를 새로 생성합니다.
   - 각 미해결 발견 사항 → 새 U-ID 단위 (title, 대상 파일, suggested_fix, 테스트 시나리오 1개 이상 포함)
   - `N` = 기존 `## Review Pass` 섹션 수 + 1
2. **루프 안내 출력** 후 중단:
   ```
   Plan updated: <plan-path>
   Added <N> fix unit(s) for unresolved P0/P1 findings.

   Fix loop:
     /genie:test   — write failing tests for the new fix units
     /genie:work   — implement against the updated plan
     /genie:review — re-review
   ```

**트래커 사전 감지:** 라우팅 질문 전 tracker-defer 프로토콜에 따라 세션의 트래커 튜플 `{ tracker_name, confidence, named_sink_available, any_sink_available }` 확인. 세션당 최대 한 번, 캐시 재사용.

**질문 도구 사전 로드 (Claude Code 전용):** `AskUserQuestion` 미로드 시 `ToolSearch select:AskUserQuestion` 호출.

**라우팅 질문.** `AskUserQuestion`으로 묻습니다. 질문: `What should the agent do with the remaining N findings?` 옵션:

```
(A) Review each finding one by one — accept the recommendation or choose another action
(B) Auto-resolve with best judgment — apply per-finding fixes the agent can defend, surface the rest
(C) File a [TRACKER] ticket per finding without applying fixes
(D) Report only — take no further action
```

tracker-defer 프로토콜에 따라 옵션 C 렌더링: `confidence=high` + `named_sink_available=true` → 구체적 이름 (예: `File a Linear ticket per finding without applying fixes`). `any_sink_available=true` (낮은 신뢰도) → `File an issue per finding without applying fixes`. `any_sink_available=false` → 옵션 C 생략 + 이슈 트래커 없음 설명 한 줄. 번호 목록 폴백은 도구 없음/에러 시만.

**선택에 따른 할당 (옵션 문자로 라우팅):**

- **(A):** walkthrough 프로토콜을 따르십시오.
  - Apply → 루프 종료 시 큐에 추가 (즉시 적용 금지).
  - Defer → tracker-defer 프로토콜로 즉시 티켓 생성.
  - Skip/Acknowledge → 기록.
  - Auto-resolve → 루프 종료, (Apply 세트 ∪ 미결정)에 수정 패스 할당.
  - 모든 발견 사항 검토 완료 시: 스테이징된 Apply 세트에 수정 도구 서브 에이전트 하나 할당.

- **(B):** 즉시 수정 도구 서브 에이전트 할당 (Stage 5b 없음, 벌크 프리뷰 없음).
  - `failed` 비어있으면 완료 보고서 출력.
  - `failed` 비어있지 않으면 먼저 질문: `N findings could not be auto-resolved. What should the agent do with them?`
    - `File tickets` → tracker-defer Interactive 모드로 라우팅.
    - `Walk through` → 실패 세트로 워크스루 재진입 (suggested_fix 있는 항목 Apply, 없는 항목 Defer 권장).
    - `Ignore` → 잔여 보고서에 기록.
  - 선택 실행 후 완료 보고서 출력.

- **(C):** 먼저 Stage 5b 검증 실행. 생존 발견 사항에 bulk-preview 프로토콜을 실행합니다. Proceed → tracker-defer 프로토콜로 모두 라우팅. Cancel → 라우팅 질문으로 복귀. 완료 보고서 출력.

- **(D):** 할당 없음. 완료 보고서 후 Step 5 게이팅 규칙에 따라 진행.

walkthrough에 정의된 통합 완료 보고서 구조를 모든 Interactive 종료 경로에서 사용.

**Autofix 모드**

질문 없음. `safe_auto -> review-fixer`만 적용. 나머지 미해결.
`fixes_applied_count > 0`이면: 커밋은 `/genie:commit`으로 진행하세요.

**Report-only 모드**

질문 없음. 수정 도구 큐/결과물 없음. Stage 6 후 중단.

**Headless 모드**

질문 없음. `safe_auto`만 단일 패스 적용. headless 출력 봉투 출력. 결과물 작성. "Review complete" 후 중단.

### Step 3: 수정 도구로 수정 적용

정확히 **하나의** 수정 도구 서브 에이전트 할당. 병렬 수정 도구 금지. 동시 브라우저 테스트와 함께 수정 리뷰 시작 금지.

**큐 계약:**
- **동질적 큐 (autofix/headless/워크스루 Apply 세트):** 모두 적용. `suggested_fix` 없는 항목 → `failed`.
- **이질적 큐 (베스트 저지먼트):**
  - `suggested_fix` 있는 `safe_auto`/`gated_auto`/`manual`: 근거 일치 확인 후 적용 또는 `failed`.
  - `suggested_fix` 없는 `gated_auto`/`manual`: `failed` (기본 문구 `no fix proposed by reviewer`).
  - `advisory`: 작업 없음 (`advisory` 라우팅).
  - 근거 일치 확인 실패: `failed` (기본 문구 `evidence no longer matches code at <file:line>`).

베스트 저지먼트는 단일 패스 (`max_rounds: 2` 없음). 다른 경로는 `max_rounds: 2` 제한.

**검증:** `requires_verification: true` 항목은 타겟 검증 실행 후 `applied`. 실패 시 `failed`.

**베스트 저지먼트 반환 형태:** `{applied, failed, advisory}` 파티션. 각 항목에 발견 사항 식별자, `autofix_class`, 심각도, file:line, 실패 시 사유 포함.

### Step 4: 결과물 발행

`/tmp/compound-engineering/review/<run-id>/`에 작성 (Interactive/autofix/headless). `metadata.json` 포함:

```json
{
  "run_id": "<run-id>",
  "branch": "<git branch --show-current>",
  "head_sha": "<git rev-parse HEAD>",
  "verdict": "<Ready to merge | Ready with fixes | Not ready>",
  "completed_at": "<ISO 8601 UTC>"
}
```

Autofix: 결과물이 전달물. 오케스트레이터가 잔여 작업 라우팅.

### Step 5: 최종 다음 단계 (Interactive 전용)

P0/P1 미해결 발견 사항이 있는 경우 Step 2의 자동 루프백이 이미 처리합니다 — 이 단계에 도달하지 않습니다.

`fixes_applied_count > 0`이면: 작업 완료. 커밋·푸시·PR은 `/genie:commit`으로 진행하세요.
카운터 0이면 완료 보고서 후 종료.

> **워크플로우 루프**: `/genie:plan` → `/genie:test` → `/genie:work` → `/genie:review` → _(P0/P1 발견 시 plan 자동 갱신 후 루프 재시작)_

**Autofix/report-only/headless:** 보고서, 결과물, 잔여 작업 전달 후 중단. 커밋/푸시/PR 없음.

## 폴백 (Fallback)

병렬 서브 에이전트 미지원 시 순차 실행. 활성 동시성 제한 시 Stage 4의 제한된 큐 규칙 사용.

---

## 포함된 참조 (Included References)

### 페르소나 카탈로그

@./references/persona-catalog.md

### 서브 에이전트 템플릿

@./references/subagent-template.md

### Diff 범위 규칙

@./references/diff-scope.md

### 발견 사항 스키마

@./references/findings-schema.json

### 리뷰 출력 템플릿

@./references/review-output-template.md

### 워크스루

@./references/walkthrough.md

### 트래커 감지 및 지연 실행

@./references/tracker-defer.md

### 일괄 작업 미리보기

@./references/bulk-preview.md

### 검증자 템플릿

@./references/validator-template.md
