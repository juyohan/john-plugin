# Changelog

All notable changes to the `john-plugin` project will be documented in this file.

## [1.3.1] - 2026-05-14

### Changed
- **TDD SKILL.md 리팩토링** (`skills/tdd/SKILL.md`): 412줄 → 112줄로 축약, Mock 위주에서 실 의존성 기반 통합 테스트 우선으로 무게중심 이동

### Fixed
- **커버리지 임계값 누락 수정** (`skills/tdd/SKILL.md`): `coverageThresholds`에 `"statements": 80` 추가

## [1.3.0] - 2026-05-13

### Changed
- **Genie Skills 구조 리팩토링**: brainstorm, plan, review, work SKILL.md를 간결하게 재작성, 현재 사용 에이전트 기준으로 정렬
- **Stage Boundary 규칙 추가** (`CLAUDE.md`): 각 `/genie:*` 단계 완료 후 자동으로 다음 단계로 넘어가지 않도록 명시적 정지 규칙 추가
- **불필요한 참조 파일 제거**: handoff, requirements-capture, synthesis-summary, universal-planning 등 10개 레퍼런스 파일 삭제
- **Korean translation**: 모든 skills SKILL.md 한국어 번역 완료
- **새 참조 파일 추가** (`skills/brainstorm/references/deep-product.md`): 제품 중심 브레인스토밍 심화 워크플로우

## [1.0.1] - 2026-05-12

### Fixed
- **Plugin Schema Validation Errors (`plugin.json`)**: 
  - **`author` field**: Changed from a string (`"John"`) to the required object format (`{"name": "John"}`).
  - **`agents` field**: Removed the `agents` array from `plugin.json`. Claude Code's schema does not support this field and relies on auto-discovery from the `agents/` directory instead.
  - **`commands` & `skills` fields**: Modified to use directory paths (`["./commands/"]`, `["./skills/"]`) instead of explicit external file paths, which the validator rejects.
- **Auto-discovery Setup**: Created `commands/` and `skills/` directories and populated them with symbolic links pointing to the respective files in the `compound-engineering-plugin` and `everything-claude-code` repositories to ensure Claude Code automatically discovers them without violating schema rules.
- **Marketplace Configuration**: Created `.claude-plugin/marketplace.json` to properly register the repository as a valid marketplace and moved `plugin.json` into the `.claude-plugin` directory. Fixed a naming mismatch where the marketplace referred to the plugin as `john` instead of `john-plugin`.
- **Documentation**: Updated `AGENTS.md` and `README.md` to correct the `ce-brainstorm` reference (from agent to command) and provided clear manual steps for copying rules, as plugins cannot auto-distribute them.

## [1.0.0] - 2026-05-12

### Added
- Initial release of John Engineering OS.
- Integrated Compound Engineering (CE) workflows (Brainstorm, Plan, Work, Compound).
- Integrated Everything Claude Code (ECC) tools and agents (Planner, TDD-Guide, Architect, Security-Reviewer).
- Added specialized support for Java/Spring Boot, Vue/Nuxt, TypeScript/JavaScript, and Database patterns (JPA, MySQL, PostgreSQL, Redis).
