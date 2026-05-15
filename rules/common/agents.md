# 에이전트 오케스트레이션 (Agent Orchestration)

## 사용 가능한 에이전트

`~/.claude/agents/` 디렉토리에 위치합니다:

| 에이전트 | 용도 | 사용 시점 |
|-------|---------|-------------|
| planner | 구현 계획 수립 | 복잡한 기능, 리팩토링 |
| architect | 시스템 설계 | 아키텍처 결정 |
| tdd-guide | 테스트 주도 개발 | 새로운 기능, 버그 수정 |
| code-reviewer | 코드 리뷰 | 코드 작성 후 |
| security-reviewer | 보안 분석 | 커밋 전 |
| build-error-resolver | 빌드 에러 수정 | 빌드 실패 시 |
| e2e-runner | E2E 테스트 | 핵심 사용자 흐름 |
| refactor-cleaner | 죽은 코드 정리 | 코드 유지보수 |
| doc-updater | 문서화 | 문서 업데이트 |
| rust-reviewer | Rust 코드 리뷰 | Rust 프로젝트 |
| harmonyos-app-resolver | HarmonyOS 앱 개발 | HarmonyOS/ArkTS 프로젝트 |

## Genie 워크플로우 커맨드

이 프로젝트는 `/genie:*` 커맨드로 각 개발 단계를 실행합니다. 각 커맨드는 해당 단계 완료 시 반드시 정지합니다 — 자동 연계 금지.

| 커맨드 | 목적 | 스테이지 |
|--------|------|---------|
| `/genie:brainstorm` | 요구사항 문서화 | Define |
| `/genie:plan` | 구현 계획 수립 | Plan |
| `/genie:test` | 실패 테스트 작성 (RED) | Test |
| `/genie:work` | 구현 + 리팩토링 (GREEN) | Work |
| `/genie:review` | 코드 리뷰 | Review |
| `/genie:commit` | 커밋 생성 | Ship |
| `/genie:learn` | 학습 자산화 및 레슨 런 정리 | Learn |

> **Genie 커맨드 vs ECC 에이전트**: `/genie:*` 커맨드가 주된 실행 단위입니다. ECC 글로벌 에이전트(`~/.claude/agents/`)는 각 커맨드 내부에서 호출됩니다.
> - `/genie:test` → `tdd-guide` / `/genie:review` → `code-reviewer`, 언어별 reviewer
> - 빌드 에러: `build-error-resolver` 대신 언어별 커맨드(`fix-go`, `fix-java`, `fix-kotlin`, `fix-swift`)를 사용하십시오.

## 즉각적인 에이전트 활용

> **주의**: 아래 지침은 `/genie:*` 워크플로우 **외부**의 탐색적·독립 작업에 적용됩니다. `/genie:*` 실행 중에는 각 단계 경계(완료 후 사용자 확인)를 반드시 준수하십시오 — 자동 연계 금지.

사용자의 별도 요청 없이도 다음의 경우 에이전트를 사용하십시오:
1. 복잡한 기능 요청 - **planner** 에이전트 사용
2. 코드 작성/수정 직후 - **code-reviewer** 에이전트 사용
3. 버그 수정 또는 새로운 기능 - **tdd-guide** 에이전트 사용
4. 아키텍처 결정 사항 - **architect** 에이전트 사용

## 태스크 병렬 실행

독립적인 작업에 대해서는 항상 병렬 태스크 실행을 사용하십시오:

```markdown
# 양호: 병렬 실행
3개의 에이전트를 병렬로 실행합니다:
1. 에이전트 1: 인증 모듈 보안 분석
2. 에이전트 2: 캐시 시스템 성능 리뷰
3. 에이전트 3: 유틸리티 타입 체크

# 불량: 불필요한 순차 실행
에이전트 1을 먼저 실행하고, 그 다음 에이전트 2, 마지막으로 에이전트 3 실행
```

## 다각도 분석

복잡한 문제의 경우, 역할을 분담한 서브 에이전트들을 활용하십시오:
- 사실 기반 리뷰어 (Factual reviewer)
- 시니어 엔지니어 (Senior engineer)
- 보안 전문가 (Security expert)
- 일관성 리뷰어 (Consistency reviewer)
- 중복 체크 전문가 (Redundancy checker)
