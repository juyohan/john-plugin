# Changelog

All notable changes to the `john-plugin` project will be documented in this file.

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
