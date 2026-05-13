# John Engineering OS (CE + ECC Unified)

이 프로젝트는 Compound Engineering(CE)의 전략적 워크플로우를 기반으로 하며, Everything Claude Code(ECC)의 강력한 실행 도구들을 통합하여 사용합니다.

## 1. 워크플로우 가이드 (The Compound Loop)

모든 작업은 다음 순서를 엄격히 준수합니다:

1.  **Brainstorm (`/genie:brainstorm`)**: 요구사항 확정.
2.  **Plan (`/genie:plan`)**: 파일·인터페이스 수준까지 구현 계획 확정. 언어 감지 후 언어별 스킬/룰 자동 제안.
3.  **TDD (`/genie:test`)**: `/genie:plan` 결과를 기반으로 실패하는 테스트 먼저 작성 (RED).
4.  **Work (`/genie:build`)**: 테스트를 통과하는 최소 구현 후 리팩토링 (GREEN → IMPROVE).
5.  **Review (ECC 기준)**: 언어별 reviewer (프로젝트 감지 자동 선택) + `security`. CRITICAL 이슈는 머지 차단, HIGH는 머지 전 수정. ECC `rules/common/code-review.md` 체크리스트 적용.
6.  **Compound (`/genie:learn`)**: 지식 자산화 및 레슨 런 정리.

## 2. 에이전트 역할 정의

| 역할 | 에이전트/명령어 | 출처 | 설명 |
| :--- | :--- | :--- | :--- |
| **Strategy** | `/genie:brainstorm` | Genie | 요구사항 분석 및 전략 수립 |
| **Architect** | `architect` | ECC | 시스템 설계 및 아키텍처 결정 |
| **Planner** | `planner` | ECC | 파일·인터페이스 수준 구현 계획 |
| **TDD** | `/genie:test` (`tdd`) | Genie | 테스트 먼저 작성 (RED→GREEN→IMPROVE) |
| **Code Review** | `review` | Genie | 일반 코드 품질·패턴·베스트 프랙티스 |
| **Language Review** | `ts`, `py`, `go`, `kotlin`, `swift`, `java` | Genie | 언어별 전용 리뷰 (프로젝트 감지 후 자동 선택) |
| **Security** | `security` | Genie | 보안 취약점·OWASP Top 10 감사 |
| **Build Fix** | `fix`, `fix-go`, `fix-kotlin`, `fix-swift`, `fix-java` | Genie | 빌드·컴파일 에러 해결 |
| **Quality** | `refactor`, `perf`, `simplify` | Genie | 리팩토링·성능·코드 단순화 |
| **E2E** | `e2e` | Genie | 핵심 사용자 흐름 E2E 테스트 |
| **Docs** | `docs` | Genie | 문서 업데이트 |

## 3. 저장소 문서 관례 (Repository Docs Convention)

CE 워크플로우의 **각 단계를 지날 때마다** 해당 단계의 산출물을 `docs/` 아래에 기록한다.
문서의 양이 많아짐에 따라 시인성을 높이기 위해 **년도/월별 폴더 구조**를 사용하며, 파일명에는 일자(`DD`)를 포함하여 정렬 순서를 유지한다.

형식: `docs/<카테고리>/YYYY/MM/DD-<제목>.md`

`/genie:think → /genie:strategy → /genie:brainstorm`은 하나의 **정의(Define) 페이즈**이므로,
think·strategy 노트는 brainstorm 산출물과 같은 폴더에 suffix로 보관한다.

| 단계 | 스킬 | 문서 경로 |
|------|------|-----------|
| 아이디어 탐색 (선택) | `/genie:think` | `docs/brainstorms/YYYY/MM/DD-<제목>-ideation.md` |
| 전략 정렬 (선택) | `/genie:strategy` | `docs/brainstorms/YYYY/MM/DD-<제목>-strategy.md` |
| 요구사항 정의 | `/genie:brainstorm` | `docs/brainstorms/YYYY/MM/DD-<제목>.md` ← 메인 산출물 |
| 구현 계획 | `/genie:plan` | `docs/plans/YYYY/MM/DD-<제목>.md` |
| TDD 명세 | `/genie:test` | `docs/tests/YYYY/MM/DD-<제목>.md` |
| 구현·디버깅 | `/genie:build`, `/genie:fix`, `/genie:optimize` | `docs/work/YYYY/MM/DD-<제목>.md` |
| 코드 리뷰 | `/genie:review` | `docs/reviews/YYYY/MM/DD-<제목>.md` |
| 지식 자산화 | `/genie:learn` | `docs/compounds/YYYY/MM/DD-<제목>.md` |

- `<제목>`을 단계 간 통일하면 같은 작업의 전체 흐름을 `docs/`에서 추적 가능
- `/genie:commit` 등 git 단계는 커밋 자체가 산출물이므로 별도 문서 불필요
- `docs/work/`에는 구현 중 의사결정, 블로커, 변경 이유 등 커밋 메시지에 담기지 않는 내용을 기록

## 4. 핵심 규칙 (Core Rules)
- **Test First**: 모든 기능은 `tdd-workflow` 스킬을 통해 테스트 코드가 선행되어야 함.
- **Strategy First**: `STRATEGY.md`에 정의되지 않은 기능 개발은 금지됨.
- **Atomic Commits**: 각 작업 트리 유닛 단위로 명확한 커밋 메시지를 작성함.
