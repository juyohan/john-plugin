#!/usr/bin/env node
'use strict';

/**
 * Bootstrap for Stop / SessionEnd hooks.
 * Reads stdin, resolves plugin root from __dirname, then delegates to
 * run-with-flags.js via spawnSync (mirroring the original inline pattern).
 *
 * Invoked as:
 *   node /abs/path/scripts/hooks/stop-hook-runner.js <hookId> <script> <profiles> [<timeoutMs>]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [, , hookId, script, profiles] = process.argv;
const timeout = parseInt(process.argv[5] || '30000', 10);

const root = path.resolve(__dirname, '../..');
process.env.CLAUDE_PLUGIN_ROOT = root;
process.env.ECC_PLUGIN_ROOT = root;

const raw = fs.readFileSync(0, 'utf8');
const runnerScript = path.join(root, 'scripts/hooks/run-with-flags.js');

if (!fs.existsSync(runnerScript)) {
  process.stderr.write(`[Hook] WARNING: run-with-flags.js not found at ${runnerScript}\n`);
  process.stdout.write(raw);
  process.exit(0);
}

const result = spawnSync(process.execPath, [runnerScript, hookId, script, profiles], {
  input: raw,
  encoding: 'utf8',
  env: process.env,
  cwd: process.cwd(),
  timeout,
});

const stdout = typeof result.stdout === 'string' ? result.stdout : '';
if (stdout) process.stdout.write(stdout);
else process.stdout.write(raw);

if (result.stderr) process.stderr.write(result.stderr);

if (result.error || result.status === null || result.signal) {
  const reason = result.error
    ? result.error.message
    : result.signal
    ? 'signal ' + result.signal
    : 'missing exit status';
  process.stderr.write(`[Hook] ERROR: hook runner failed: ${reason}\n`);
  process.exit(1);
}

process.exit(Number.isInteger(result.status) ? result.status : 0);
