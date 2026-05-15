# 훅(Hooks) 시스템

## 훅 유형

- **PreToolUse**: 도구 실행 전 (검증, 파라미터 수정)
- **PostToolUse**: 도구 실행 후 (자동 포맷, 추가 검사)
- **Stop**: 세션 종료 시 (최종 확인)

## 자동 승인 권한

주의해서 사용하십시오:
- 신뢰할 수 있고 잘 정의된 계획에 대해서만 활성화하십시오.
- 탐색적인 작업에 대해서는 비활성화하십시오.
- `dangerously-skip-permissions` 플래그는 절대 사용하지 마십시오.
- 대신 `~/.claude.json`에서 `allowedTools`를 설정하십시오.

## 프로젝트 훅 인프라

이 프로젝트(`genie-plugin`)는 `scripts/hooks/bash-hook-dispatcher.js`를 통해 훅을 중앙 관리합니다.

### 훅 ID 체계

`hooks/hooks.json`에 등록된 최상위 훅은 `dispatcher` ID를 사용하며, 실제 기능은 dispatcher 내부 ID로 라우팅됩니다:

```
# hooks.json 최상위 등록 ID (bash-hook-dispatcher.js 호출)
pre:bash:dispatcher          — PreToolUse: bash-hook-dispatcher.js 진입점
post:bash:dispatcher         — PostToolUse: bash-hook-dispatcher.js 진입점

# dispatcher 내부 라우팅 ID (hooks.json에 직접 등록되지 않음)
  └ pre:bash:auto-version-bump   — Bash 실행 전 버전 자동 갱신 판단
  └ post:bash:*                  — Bash 실행 후 결과 처리
```

### 프로필 시스템

`~/.claude/settings.json`의 `hookProfile` 값으로 활성 훅 집합을 제어합니다:

| 프로필 | 설명 | 적합한 상황 |
|--------|------|------------|
| `minimal` | 핵심 훅만 활성화 | 탐색·실험 작업 |
| `standard` | 기본 훅 세트 | 일반 개발 |
| `strict` | 모든 훅 + GateGuard | 프로덕션 배포 전 |

**프로필별 활성 훅 목록** (`bash-hook-dispatcher.js` 기준):

| 훅 ID | minimal | standard | strict |
|-------|:-------:|:--------:|:------:|
| `pre:bash:block-no-verify` | ✓ | ✓ | ✓ |
| `pre:bash:auto-tmux-dev` | — | ✓ | ✓ |
| `pre:bash:gateguard-fact-force` | — | ✓ | ✓ |
| `post:bash:command-log-cost` | — | ✓ | ✓ |
| `post:bash:pr-created` | — | ✓ | ✓ |
| `post:bash:build-complete` | — | ✓ | ✓ |
| `pre:bash:tmux-reminder` | — | — | ✓ |
| `pre:bash:git-push-reminder` | — | — | ✓ |
| `pre:bash:commit-quality` | — | — | ✓ |
| `post:bash:command-log-audit` | — | — | ✓ |

> profiles 미설정 훅은 기본값 `standard,strict`로 동작합니다 (`hook-flags.js` `parseProfiles` fallback 참조).

### 새 훅 추가 절차

1. `scripts/hooks/` 아래에 훅 파일 생성
2. `bash-hook-dispatcher.js`에 훅 ID 등록
3. 해당 프로필에 훅 추가
4. `scripts/install-hooks.js`로 설치 확인
