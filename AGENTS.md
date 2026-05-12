# John Engineering OS (CE + ECC Unified)

이 프로젝트는 Compound Engineering(CE)의 전략적 워크플로우를 기반으로 하며, Everything Claude Code(ECC)의 강력한 실행 도구들을 통합하여 사용합니다.

## 1. 워크플로우 가이드 (The Compound Loop)

모든 작업은 다음 순서를 엄격히 준수합니다:

1.  **Brainstorm (`/ce-brainstorm`)**: 요구사항 확정 및 `STRATEGY.md` 정렬.
2.  **Plan (`/ce-plan`)**: 상위 설계 및 작업 트리 생성.
3.  **TDD Start (`tdd-workflow`)**: 코드를 짜기 전, ECC 가이드에 따라 실패하는 테스트 먼저 작성.
4.  **Implementation Plan (`/plan`)**: 테스트를 통과시키기 위한 세부 파일 수정 계획 수립.
5.  **Work & Review**: 계획에 따라 코드를 수정하고 `/ce-code-review`로 품질 검증.
6.  **Compound (`/ce-compound`)**: 지식 자산화 및 레슨 런 정리.

## 2. 에이전트 역할 정의

| 역할 | 에이전트/명령어 | 출처 | 설명 |
| :--- | :--- | :--- | :--- |
| **Strategy** | `/ce-brainstorm` | CE | 요구사항 분석 및 전략 수립 (명령어 기반) |
| **Architect** | `architect` | ECC | 고도화된 시스템 설계 및 아키텍처 검토 |
| **Planner** | `planner` | ECC | 구체적인 코드 수정 및 구현 전략 수립 |
| **Engineer** | `tdd-guide` | ECC | 테스트 주도 개발 및 품질 보장 |
| **Security** | `security-reviewer` | ECC | 보안 취약점 및 OWASP Top 10 감사 |

## 3. 핵심 규칙 (Core Rules)
- **Test First**: 모든 기능은 `tdd-workflow` 스킬을 통해 테스트 코드가 선행되어야 함.
- **Strategy First**: `STRATEGY.md`에 정의되지 않은 기능 개발은 금지됨.
- **Atomic Commits**: 각 작업 트리 유닛 단위로 명확한 커밋 메시지를 작성함.
