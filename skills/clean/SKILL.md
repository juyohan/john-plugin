---
name: clean
description: 원격 추적 브랜치가 삭제된 로컬 브랜치를 정리합니다. 사용자가 "브랜치 정리해줘", "삭제된 브랜치 지워줘", "로컬 브랜치 프룬(prune)", "clean gone"이라고 말하거나, 원격에 더 이상 존재하지 않는 오래된 로컬 브랜치를 제거하고 싶어 할 때 사용합니다. 관련 워크트리가 있는 브랜치의 경우 워크트리 제거도 함께 처리합니다.
allowed-tools:
  - gem
---
> **Base guidelines**: [SKILL.md](../SKILL.md) applies to this skill.


# 삭제된 브랜치 정리 (Clean Gone Branches)

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


원격 추적 브랜치가 삭제된 로컬 브랜치를 삭제하며, 관련 워크트리가 있다면 함께 제거합니다.

## 워크플로우

### 단계 1: 삭제된 브랜치 찾기

최신 원격 상태를 가져오고 삭제된 브랜치를 식별하기 위해 검색 스크립트를 실행합니다:

```bash
bash scripts/clean-gone
```

[scripts/clean-gone](./scripts/clean-gone)

이 스크립트는 먼저 `git fetch --prune`을 실행한 다음, `git branch -vv`를 파싱하여 `: gone]`으로 표시된 브랜치를 찾습니다.

스크립트 결과가 `__NONE__`이면, 오래된 브랜치가 발견되지 않았음을 보고하고 중단합니다.

### 단계 2: 브랜치 목록 제시 및 확인 요청

삭제될 브랜치 목록을 사용자에게 보여줍니다. 다음과 같이 간단한 목록 형식으로 작성합니다:

```
다음 로컬 브랜치들이 원격에서 삭제되었습니다:

  - feature/old-thing
  - bugfix/resolved-issue
  - experiment/abandoned

모두 삭제하시겠습니까? (y/n)
```

플랫폼의 질문 도구를 사용하여 사용자의 답변을 기다립니다: Claude Code의 `AskUserQuestion` (스키마가 로드되지 않은 경우 `ToolSearch`로 `select:AskUserQuestion` 먼저 호출), Codex의 `request_user_input`, Gemini의 `ask_user`, Pi의 `ask_user` (`pi-ask-user` 확장 필요). 도구가 없거나 오류가 발생하는 경우에만 채팅 창에 목록을 제시하십시오. 질문을 소리 없이 건너뛰지 마십시오.

이는 전체 목록에 대한 예/아니오 결정이며, 개별 브랜치 선택 옵션은 제공하지 않습니다.

### 단계 3: 확인된 브랜치 삭제

사용자가 확인하면 각 브랜치를 삭제합니다. 각 브랜치에 대해:

1. 관련 워크트리가 있는지 확인합니다 (`git worktree list | grep "\\[$branch\\]"`).
2. 워크트리가 존재하고 메인 저장소 루트가 아니라면, 먼저 제거합니다: `git worktree remove --force "$worktree_path"`.
3. 브랜치를 삭제합니다: `git branch -D "$branch"`.

진행 상황을 다음과 같이 보고합니다:

```
워크트리 제거됨: .worktrees/feature/old-thing
브랜치 삭제됨: feature/old-thing
브랜치 삭제됨: bugfix/resolved-issue
브랜치 삭제됨: experiment/abandoned

총 3개의 브랜치를 정리했습니다.
```

사용자가 거부하면 이를 확인하고 아무것도 삭제하지 않은 채 중단합니다.
