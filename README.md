# John Engineering OS 🚀

**John Engineering OS**는 가장 강력한 두 가지 클로드 코드 플러그인을 하나로 통합한 커스텀 엔지니어링 배포판입니다. 
**Compound Engineering(CE)**의 전략적 워크플로우와 **Everything Claude Code(ECC)**의 압도적인 실행력을 결합하여, 기획부터 배포까지 빈틈없는 개발 경험을 제공합니다.

---

## 🛠 구성 요소
- **기획의 뇌 (CE)**: Brainstorm, Plan, Strategy, Work Tree 관리
- **실행의 근육 (ECC)**: Java/Spring Boot, Vue/Nuxt, TS/JS 전문 에이전트 및 200+ 스킬
- **데이터 레이어**: JPA, MySQL, PostgreSQL, Redis 최적화 패턴
- **품질 보증**: TDD, Security Scan, Performance Review

---

## 🚀 시작하기 (설치 방법)

Claude Code CLI 환경에서 다음 명령어를 순서대로 실행하세요.

```bash
# 1. 로컬 저장소 등록
/plugin marketplace add /Users/juyohan/John/ai/john-plugin

# 2. 통합 플러그인 설치
/plugin install john-plugin@john
```

### ⚠️ 필수 추가 설정 (규칙 적용)
Claude Code 플러그인은 코딩 규칙(Rules)을 자동으로 복사하지 못합니다. 플러그인이 정상 작동하려면 다음 명령어로 규칙을 복사해야 합니다.

```bash
# John Plugin의 규칙들을 Claude 설정 폴더로 복사
mkdir -p ~/.claude/rules/john
cp -R /Users/juyohan/John/ai/john-plugin/rules/* ~/.claude/rules/john/
```

---

## 🔄 핵심 워크플로우 (The John Loop)

이 플러그인을 사용할 때는 다음의 **6단계 루프**를 따르는 것을 권장합니다.

### 1. 요구사항 정의 (`/ce-brainstorm`)
- **언제**: 새로운 기능을 만들기 전
- **목표**: 비즈니스 가치를 정의하고 `STRATEGY.md`를 업데이트합니다.

### 2. 전략적 설계 (`/ce-plan`)
- **언제**: 브레인스토밍 완료 후
- **목표**: 상위 아키텍처를 설계하고 작업을 쪼개어 '작업 트리'를 생성합니다.

### 3. 테스트 선행 작성 (`tdd-workflow` 스킬)
- **언제**: 코드를 수정하기 직전
- **목표**: ECC의 TDD 가이드에 따라 실패하는 테스트 코드를 먼저 작성하여 명세를 확정합니다.

### 4. 구체적 구현 계획 (`/plan`)
- **언제**: 테스트 코드가 준비되었을 때
- **목표**: 작성된 테스트를 통과시키기 위해 정확히 어떤 파일을 수정할지 ECC Planner가 계획을 세웁니다.

### 5. 실행 및 리뷰 (`/ce-work` & `/ce-code-review`)
- **언제**: 계획 수립 완료 후
- **목표**: 코드를 작성하고, 전문 에이전트(`java-reviewer`, `database-reviewer` 등)에게 검증받습니다.

### 6. 지식 자산화 (`/ce-compound`)
- **언제**: 기능 개발 완료 후
- **목표**: 이번 세션에서 배운 지식을 기록하여 시스템이 다음번에 더 똑똑하게 일하게 만듭니다.

---

## 🧭 주요 전문 에이전트 목록

| 명령어/에이전트 | 전문 분야 | 추천 활용 상황 |
| :--- | :--- | :--- |
| `/ce-brainstorm` | 전략 및 기획 | 요구사항이 모호할 때 질문을 통해 명확화 |
| `architect` | 시스템 설계 | 대규모 리팩토링이나 신규 아키텍처 설계 시 |
| `planner` | 구현 전략 | 구체적인 파일 수정 리스트를 뽑아야 할 때 |
| `tdd-guide` | 테스트 | 테스트 코드 작성 및 커버리지 확보 시 |
| `java-reviewer` | Java/Spring | Spring Boot 모범 사례 및 성능 리뷰 |
| `database-reviewer` | JPA/DB | SQL 최적화, N+1 문제, 인덱스 설계 검토 |
| `typescript-reviewer` | TS/JS | 타입 안정성 및 프론트엔드 최적화 리뷰 |

## 💡 풀버전 ECC vs `john-plugin`의 차이점

이 플러그인은 원본 `everything-claude-code`의 무거운 기능들을 모두 가져오는 대신, **철저히 선별된(Curated) 정예 요원만 담아낸 가벼운 배포판**입니다.

- **명령어의 최소화**: 원본 ECC의 70여 개가 넘는 슬래시(`/`) 명령어를 빼고, CE의 핵심 기획 명령어(`/ce-brainstorm`, `/ce-plan` 등) 4개와 실행을 위한 `/plan` 만을 노출합니다. 에이전트가 불필요한 명령어에 혼동하는 것을 막습니다.
- **백그라운드 지원**: 슬래시 명령어가 없다고 기능이 없는 것이 아닙니다. `@java-reviewer` 처럼 채팅창에 에이전트를 직접 부르거나, "Spring Boot 보안을 적용해 줘"라고 하면 뒤에 숨겨진 `springboot-security` 스킬과 자동화 훅(Hooks)들이 **동일한 수준의 기술력으로 조용히 서포트**합니다.

---

## 💡 팁: 똑똑하게 질문하기

- **백엔드**: "`/ce-plan`으로 주문 API를 설계해줘. `jpa-patterns`와 `springboot-security`를 적용해야 해."
- **프론트엔드**: "`nuxt4-patterns`를 참고해서 대시보드 화면을 설계하고, `ui-to-vue` 스킬로 스타일을 입혀줘."
- **DB 최적화**: "이 JPA 엔티티들의 연관관계를 `database-reviewer`가 검토하고 인덱스 전략을 세워줘."

---

## 📂 디렉토리 구조 및 관리

- `plugin.json`: 모든 커맨드와 에이전트의 경로를 관리하는 컨트롤 타워
- `AGENTS.md`: Claude에게 일하는 방식을 가르치는 핵심 지침서
- `rules/`: 사용자 전용 코딩 표준 저장소

**유지보수 Tip**: 원본(ECC, CE) 소스는 건드리지 않고 경로만 참조하므로, 원본 폴더에서 `git pull`만 하면 언제든 최신 기능을 유지할 수 있습니다.
