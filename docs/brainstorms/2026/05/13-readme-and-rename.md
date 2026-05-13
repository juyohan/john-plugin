# README 재작성 + genie:work → genie:work 리네이밍

**날짜:** 2026-05-13
**상태:** 브레인스토밍 완료 → 플랜 대기

---

## 개요

두 가지 작업:
1. README.md를 현재 genie 커맨드 기준으로 전면 재작성
2. `genie:work` → `genie:work` 전체 리네이밍

---

## Requirements (R-IDs)

### README 재작성

| ID | 요구사항 |
|----|---------|
| R1 | README는 현재 genie 커맨드(/genie:setup, /genie:brainstorm, /genie:plan, /genie:work, /genie:review, /genie:commit, /genie:learn 등) 기준으로 재작성한다 |
| R2 | 핵심 워크플로우는 `setup → brainstorm → plan → work → review → commit → learn` 순서로 기술한다 |
| R3 | `/genie:setup`을 첫 번째 단계로 포함한다 |
| R4 | 구버전 커맨드(`/ce-brainstorm`, `/ce-plan`, `/ce-work`, `/ce-compound`, `tdd-workflow 스킬`) 참조를 모두 제거한다 |
| R5 | 설치 방법은 현재 README의 내용을 유지한다 (이미 정확함) |
| R6 | 한국어 유지 |

### genie:work → genie:work 리네이밍

| ID | 요구사항 |
|----|---------|
| R7 | `commands/build.md` → `commands/work.md` 파일 rename |
| R8 | `skills/build/` → `skills/work/` 디렉토리 rename |
| R9 | 모든 .md 파일에서 `genie:work` → `genie:work` 텍스트 치환 |
| R10 | CLAUDE.md, AGENTS.md의 워크플로우 다이어그램 및 커맨드 참조 업데이트 |

---

## 스코프 경계

**포함:**
- README.md 전면 재작성
- commands/build.md → work.md rename
- skills/build/ → skills/work/ rename
- 모든 참조 파일 텍스트 치환

**제외:**
- 스킬 내부 로직 변경
- 기타 커맨드 이름 변경

---

## 다음 단계

→ `/genie:plan` 없이 바로 `/genie:work` 진행 (Lightweight 범위)
