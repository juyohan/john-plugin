# 기본 브랜치에서의 브랜치 생성 (Branch creation from default branch)

Step 4가 기본 브랜치(default branch)에서 실행될 때, 로컬 `<base>` (예: 로컬 `main`)는 시작점으로 신뢰할 수 없습니다. 두 가지 실패 모드가 이를 유발합니다:

- **오래된 베이스 오염 (Stale-base contamination).** 다른 에이전트 세션, worktree 또는 백그라운드 프로세스가 이번 작업과 무관한 커밋으로 로컬 `<base>`를 `origin/<base>`보다 앞서게 만들었을 수 있습니다. 로컬 HEAD에서 브랜치를 생성하면 해당 커밋들이 새로운 피처 브랜치와 최종 PR에 포함됩니다.
- **브랜치 생성 망각 (Forgot-to-branch).** 사용자가 피처 브랜치에서 작업할 의도로 로컬 `<base>`에 실제 커밋을 작성했을 수 있습니다. `origin/<base>`에서 브랜치를 생성하면 해당 커밋들이 조용히 누락됩니다.

로컬 git 상태만으로는 이 두 가지를 구분할 수 없습니다 — 푸시되지 않은 커밋들이 동일하게 보이기 때문입니다. 모든 세션이 `user.email`을 공유하는 다중 세션 환경에서는 작성자 이메일도 신뢰할 수 없습니다. 따라서 푸시되지 않은 커밋이 있는 경우 스킬은 사용자에게 선택권을 부여합니다.

## 결정 흐름

단계를 순서대로 실행하십시오. 각 단계의 결과가 다음 단계의 실행 여부를 결정합니다.

### 1. 원격 베이스 업데이트 (Fetch fresh remote base)

```bash
git fetch --no-tags origin <base>
```

- **Fetch 성공:** 2단계로 계속 진행합니다.
- **Fetch 실패:** 이 파일 하단의 "Fetch 실패 폴백" 섹션으로 이동합니다.

### 2. `<base>`에서 푸시되지 않은 로컬 커밋 확인

```bash
git log origin/<base>..HEAD --oneline
```

- **출력 없음:** 푸시되지 않은 커밋 없음 — `BASE_REF=origin/<base>`로 3단계를 진행합니다.
- **출력 있음:** 로컬 `<base>`에 푸시되지 않은 커밋이 존재합니다. 사용자에게 커밋 목록을 보여주고 질문하십시오 (플랫폼의 차단 질문 도구 사용 — `SKILL.md` 상단의 "Asking the user" 컨벤션 참조):

  > "Local `<base>` has N unpushed commits not on `origin/<base>`. Carry them onto the new feature branch, or leave them on local `<base>`?"

  두 가지 옵션:
  - **Carry forward** (의도: "브랜치를 먼저 생성하는 것을 잊었습니다") — `BASE_REF=HEAD`로 설정합니다. 새로운 브랜치는 현재 로컬 HEAD에서 시작하여 커밋들을 보존합니다.
  - **Leave on `<base>`** (의도: "다른 세션에 의한 오래된 베이스 오염") — `BASE_REF=origin/<base>`로 설정합니다. 새로운 브랜치는 깨끗하게 시작하며, 커밋들은 로컬 `<base>`에 남겨두어 사용자가 별도로 처리하게 합니다.

  차단 도구를 사용할 수 없어 채팅으로 폴백해야 하는 경우, 사용자가 응답한 **후에만** 기본적으로 **leaving on `<base>`**를 선택하십시오 — 절대 조용히 진행하지 마십시오. 외부 커밋을 PR에 포함시키는 것은 다시 질문하는 것보다 더 큰 실패입니다.

### 3. 피처 브랜치 생성

```bash
git checkout -b <branch-name> "$BASE_REF"
```

- **Checkout 성공:** 브랜치가 생성되었습니다. `SKILL.md`의 Step 4.2를 계속 진행합니다.
- **커밋되지 않은 변경 사항이 덮어써질 수 있어 Checkout 실패:** 로컬 `<base>`가 사용자가 편집한 파일에서 `origin/<base>`와 충돌합니다. Stash 후 재시도하고 Pop 합니다:

  ```bash
  git stash push -u -m "genie:push-pr: pre-branch <branch-name>"
  git checkout -b <branch-name> "$BASE_REF"
  git stash pop
  ```

  `git stash pop`에서 충돌이 보고되는 경우(드문 경우임), 충돌 출력과 stash 참조를 사용자에게 보여주어 수동으로 해결하게 하십시오. 자동 해결을 시도하지 마십시오.

  참고: 이 stash-retry-pop은 `BASE_REF`가 `HEAD`이든 `origin/<base>`이든 관계없이 적용됩니다. `HEAD`인 경우 인덱스가 이미 HEAD에 있으므로 덮어쓰기 충돌 가능성이 낮지만, 동일한 복구 시퀀스를 실행해도 안전합니다.

## Fetch 실패 폴백

`git fetch --no-tags origin <base>`가 실패하는 경우(네트워크, 인증, 원격 없음), 스킬은 베이스의 최신 여부를 확인하거나 푸시되지 않은 커밋을 원격으로 감지할 수 없습니다. 다음으로 폴백합니다:

```bash
git checkout -b <branch-name>
```

이는 현재 로컬 HEAD에서 브랜치를 생성합니다. 사용자 대면 요약에 베이스 최신 여부가 확인되지 않았음을 명시하십시오. 신선한 `origin/<base>` 없이는 결과가 부정확하므로 푸시되지 않은 커밋 확인을 시도하지 마십시오.
