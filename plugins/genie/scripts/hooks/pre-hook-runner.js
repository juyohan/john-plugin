#!/usr/bin/env node
'use strict';

/**
 * Lightweight bootstrap for PreToolUse / PostToolUse / PreCompact / SessionStart hooks.
 * Resolves CLAUDE_PLUGIN_ROOT from __dirname (no runtime search needed) and
 * delegates to plugin-hook-bootstrap.js with the correct argv layout.
 *
 * Invoked as:
 *   node /abs/path/scripts/hooks/pre-hook-runner.js <mode> <relScript> [args…]
 *
 * plugin-hook-bootstrap.js reads:  argv[2]=mode  argv[3]=relScript  argv[4+]=args
 * So we replace argv[1] (this runner's path) with the bootstrap path to match
 * the argv layout the bootstrap expects.
 */

const path = require('path');

const root = path.resolve(__dirname, '../..');
process.env.CLAUDE_PLUGIN_ROOT = root;

const bootstrap = path.join(root, 'scripts/hooks/plugin-hook-bootstrap.js');
process.argv[1] = bootstrap;
require(bootstrap);
