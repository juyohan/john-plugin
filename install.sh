#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${HOME}/.claude"
AGENTS_DST="${CLAUDE_DIR}/agents"
RULES_DST="${CLAUDE_DIR}/rules"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

agents_linked=0
agents_skipped=0
rules_linked=0
rules_skipped=0

echo -e "${CYAN}John Plugin — install${RESET}"
echo "Plugin root: ${PLUGIN_DIR}"
echo ""

# ── agents ───────────────────────────────────────────────────────────────────
mkdir -p "${AGENTS_DST}"
echo "Linking agents → ${AGENTS_DST}"

for src in "${PLUGIN_DIR}/plugins/genie/agents/"*.md; do
  [ -f "${src}" ] || continue
  name="$(basename "${src}")"
  dst="${AGENTS_DST}/${name}"
  if [ -e "${dst}" ] || [ -L "${dst}" ]; then
    echo -e "  ${YELLOW}skip${RESET}  ${name} (already exists)"
    ((agents_skipped++)) || true
  else
    ln -s "${src}" "${dst}"
    echo -e "  ${GREEN}link${RESET}  ${name}"
    ((agents_linked++)) || true
  fi
done

echo ""

# ── rules ─────────────────────────────────────────────────────────────────────
mkdir -p "${RULES_DST}"
echo "Linking rules → ${RULES_DST}"

for src in "${PLUGIN_DIR}/rules/"/*/; do
  [ -d "${src}" ] || continue
  name="$(basename "${src}")"
  dst="${RULES_DST}/${name}"
  if [ -e "${dst}" ] || [ -L "${dst}" ]; then
    echo -e "  ${YELLOW}skip${RESET}  ${name}/ (already exists)"
    ((rules_skipped++)) || true
  else
    ln -s "${src%/}" "${dst}"
    echo -e "  ${GREEN}link${RESET}  ${name}/"
    ((rules_linked++)) || true
  fi
done

echo ""

# ── hooks ─────────────────────────────────────────────────────────────────────
echo "Hooks setup"
echo -e "  Merge ${CYAN}${PLUGIN_DIR}/plugins/genie/hooks/hooks.json${RESET} into ${CYAN}${CLAUDE_DIR}/settings.json${RESET}"
echo "  To apply hooks automatically, run:"
echo ""
echo -e "    ${CYAN}node ${PLUGIN_DIR}/plugins/genie/scripts/install-hooks.js${RESET}"
echo ""
echo "  Or merge manually following the Claude Code hooks documentation."
echo ""

# ── summary ───────────────────────────────────────────────────────────────────
echo -e "${GREEN}Done.${RESET}"
echo "  Agents:  ${agents_linked} linked, ${agents_skipped} skipped"
echo "  Rules:   ${rules_linked} linked, ${rules_skipped} skipped"
echo ""
echo "Optional: set hook profile with  export ECC_HOOK_PROFILE=strict"
echo "See config/profiles.json for profile options."
