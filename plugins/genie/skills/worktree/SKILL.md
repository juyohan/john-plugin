---
name: worktree
description: 병렬 기능 작업 또는 PR 검토를 위해 격리된 git 워크트리를 생성합니다. 현재 체크아웃을 방해하지 않고 작업을 시작하고 싶을 때, 또는 `genie:work`나 `genie:review`에서 워크트리 옵션을 제공할 때 사용합니다.
allowed-tools:
  - Bash(bash *worktree-manager.sh)
  - gem
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.


# 워크트리 생성

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


`git worktree add`만으로는 처리되지 않는 브랜치별 설정을 포함하여 `.worktrees/<branch>` 아래에 워크트리를 생성합니다:

- 메인 저장소에서 `.env`, `.env.local`, `.env.test` 등을 복사합니다 (`.env.example`은 제외)
- `mise`/`direnv` 설정을 신뢰합니다. 단, 검토 브랜치가 신뢰할 수 없는 `.envrc` 콘텐츠를 자동으로 신뢰하지 않도록 브랜치 인식 보안 규칙을 적용합니다.
- `.worktrees`가 아직 무시되지 않은 경우 `.gitignore`에 추가합니다.
- 메인 저장소 체크아웃을 수정하지 않습니다 — `from-branch`는 체크아웃되지 않고 페치(fetch)됩니다.

## 워크트리 생성하기

런타임 Bash 도구를 통해 번들로 제공되는 스크립트를 호출합니다. Claude Code에서 `${CLAUDE_SKILL_DIR}`은 마켓플레이스 캐시 설치와 `claude --plugin-dir` 로컬 개발 모두에서 스킬 자체 디렉토리로 해석됩니다. 런타임 Bash 도구의 현재 작업 디렉토리(CWD)는 스킬 디렉토리가 아닌 사용자의 프로젝트이므로 단순한 `bash scripts/worktree-manager.sh`는 실패합니다. 다른 대상(Codex, Gemini, Pi 등)에서는 `${CLAUDE_SKILL_DIR}`이 설정되지 않으며, `:-.` 폴백을 통해 해당 하네스가 기대하는 상대 경로가 생성됩니다.

```bash
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create <branch-name> [from-branch]
```

기본값:
- `from-branch`의 기본값은 원격(origin)의 기본 브랜치입니다 (해결할 수 없는 경우 `main`).
- 새 브랜치는 `origin/<from-branch>` (원격을 사용할 수 없는 경우 로컬 참조)에서 생성됩니다.

예시:
```bash
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create feat/login
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create fix/email-validation develop
```

생성 후 `cd .worktrees/<branch-name>`을 사용하여 워크트리로 전환합니다.

## 기타 워크트리 작업

`git`을 직접 사용하세요 — 별도의 래퍼(wrapper)는 필요하지 않으며 제공되지 않습니다:

```bash
git worktree list                          # 워크트리 목록 표시
git worktree remove .worktrees/<branch>    # 워크트리 제거
cd .worktrees/<branch>                     # 워크트리로 전환
cd "$(git rev-parse --show-toplevel)"      # 메인 체크아웃으로 복귀
```

`.env*` 파일 없이 생성된 기존 워크트리에 파일을 복사하려면, 메인 저장소에서 다음을 실행하세요 (워크트리 내부가 아님. 브랜치 이름에 `feat/login`과 같이 슬래시가 포함되는 경우가 많기 때문입니다):
```bash
cp .env* .worktrees/<branch>/
```

## 개발 도구 신뢰 동작

`mise` 또는 `direnv` 설정이 있는 경우, 스크립트는 후크나 스크립트가 대화형 프롬프트에서 차단되지 않도록 해당 설정을 신뢰하려고 시도합니다. 신뢰 여부는 기준 브랜치와 대조하여 확인됩니다:

- **신뢰할 수 있는 베이스 브랜치** (`main`, `develop`, `dev`, `trunk`, `staging`, `release/*`): 새 워크트리의 설정을 해당 브랜치와 비교하며, 변경되지 않은 설정은 자동으로 신뢰됩니다. `direnv allow`가 허용됩니다.
- **기타 브랜치** (기능 브랜치, PR 검토 브랜치): 설정을 기본 브랜치와 비교합니다. `direnv allow`는 건너뜁니다. `.envrc`가 direnv에서 검증하지 않는 파일을 소스로 사용할 수 있기 때문입니다.

수정된 설정은 절대 자동으로 신뢰되지 않습니다. 스크립트는 검토 후 실행할 수동 신뢰 명령을 출력합니다.

## 워크트리를 생성해야 하는 경우

워크트리를 생성하는 경우:
- 메인 체크아웃을 다른 작업을 위해 비워두면서 PR을 검토할 때
- 브랜치 전환 오버헤드 없이 여러 기능을 병렬로 실행할 때
- 기본 브랜치에 진행 중인 상태를 남기지 않으려 할 때

메인 체크아웃의 브랜치에서 수행할 수 있는 단일 작업의 경우에는 워크트리를 생성하지 마세요.

## 통합

`genie:work` 및 `genie:review`는 이 스킬을 옵션으로 제공합니다. 사용자가 해당 흐름에서 "worktree"를 선택하면, 작업 설명에서 유도된 의미 있는 브랜치 이름(예: `feat/crowd-sniff`, `fix/email-validation`)과 함께 `bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create <branch>`를 호출하세요. 작업 내용을 가리는 `worktree-jolly-beaming-raven`과 같은 자동 생성된 이름은 피하세요.

## 문제 해결

**"Worktree already exists"**: 해당 경로가 이미 사용 중입니다. 다시 생성하기 전에 해당 경로로 전환(`cd .worktrees/<branch>`)하거나 제거(`git worktree remove .worktrees/<branch>`)하세요.

**"Cannot remove worktree: it is the current worktree"**: 먼저 워크트리 밖으로 `cd`한 다음 `git worktree remove`를 실행하세요.

**개발 도구 신뢰를 건너뜀**: 스크립트가 수동 명령을 출력합니다. 설정 차이(`git diff <base-ref> -- .envrc`)를 검토한 후, 워크트리 디렉토리에서 출력된 명령을 실행하세요.
