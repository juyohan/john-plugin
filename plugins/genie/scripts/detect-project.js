#!/usr/bin/env node
'use strict';

/**
 * detect-project.js — Detect project language and recommend agents/rules/skills.
 * Usage: node scripts/detect-project.js [project-path]
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

function exists(file) {
  return fs.existsSync(path.join(projectDir, file));
}

function glob(pattern) {
  try {
    const entries = fs.readdirSync(projectDir);
    const re = new RegExp(pattern.replace('.', '\\.').replace('*', '.*'));
    return entries.some(e => re.test(e));
  } catch {
    return false;
  }
}

const detections = [];

// TypeScript / Node.js
if (exists('package.json') && exists('tsconfig.json')) {
  const isNuxt = exists('nuxt.config.ts') || exists('nuxt.config.js') || exists('nuxt.config.mjs');
  const isVue = exists('vue.config.js') || exists('vue.config.ts');

  if (isNuxt) {
    detections.push({
      language: 'Vue / Nuxt',
      agents: ['typescript-reviewer'],
      rules: ['typescript', 'web'],
      skills: ['nuxt4-patterns', 'ui-to-vue', 'frontend-patterns', 'vite-patterns'],
    });
  } else if (isVue) {
    detections.push({
      language: 'Vue',
      agents: ['typescript-reviewer'],
      rules: ['typescript', 'web'],
      skills: ['ui-to-vue', 'frontend-patterns', 'vite-patterns'],
    });
  } else {
    detections.push({
      language: 'TypeScript / Node.js',
      agents: ['typescript-reviewer'],
      rules: ['typescript', 'web'],
      skills: ['frontend-patterns', 'vite-patterns'],
    });
  }
} else if (exists('package.json')) {
  // JavaScript without tsconfig
  const isNuxt = exists('nuxt.config.js') || exists('nuxt.config.mjs');
  if (isNuxt) {
    detections.push({
      language: 'Nuxt (JavaScript)',
      agents: ['typescript-reviewer'],
      rules: ['typescript', 'web'],
      skills: ['nuxt4-patterns', 'ui-to-vue'],
    });
  } else {
    detections.push({
      language: 'JavaScript / Node.js',
      agents: ['typescript-reviewer'],
      rules: ['typescript'],
      skills: ['frontend-patterns'],
    });
  }
}

// Python
if (exists('requirements.txt') || exists('pyproject.toml') || exists('setup.py') || exists('setup.cfg')) {
  detections.push({
    language: 'Python',
    agents: ['python-reviewer'],
    rules: ['python'],
    skills: ['coding-standards'],
  });
}

// Go
if (exists('go.mod')) {
  detections.push({
    language: 'Go',
    agents: ['go-reviewer', 'go-build-resolver'],
    rules: ['golang'],
    skills: ['backend-patterns'],
  });
}

// Java
if (exists('pom.xml') || exists('build.gradle')) {
  detections.push({
    language: 'Java / Spring Boot',
    agents: ['java-reviewer', 'java-build-resolver'],
    rules: ['java'],
    skills: ['springboot-patterns', 'jpa-patterns'],
  });
}

// Kotlin
if (exists('build.gradle.kts')) {
  detections.push({
    language: 'Kotlin',
    agents: ['kotlin-reviewer', 'kotlin-build-resolver'],
    rules: ['kotlin'],
    skills: [],
  });
}

// Swift
if (glob('*.xcodeproj') || exists('Package.swift')) {
  detections.push({
    language: 'Swift',
    agents: ['swift-reviewer', 'swift-build-resolver'],
    rules: ['swift'],
    skills: [],
  });
}

// Rust
if (exists('Cargo.toml')) {
  detections.push({
    language: 'Rust',
    agents: ['rust-reviewer'],
    rules: ['rust'],
    skills: [],
  });
}

// PHP
if (exists('composer.json')) {
  detections.push({
    language: 'PHP',
    agents: [],
    rules: ['php'],
    skills: [],
  });
}

// Output
if (detections.length === 0) {
  console.log('프로젝트 타입을 감지할 수 없습니다.');
  console.log('');
  console.log('수동으로 agents/rules/skills를 선택하거나,');
  console.log('프로젝트 루트에 언어 설정 파일이 있는지 확인하십시오.');
  process.exit(0);
}

console.log('# 프로젝트 감지 결과\n');
console.log(`**경로:** ${projectDir}\n`);

for (const d of detections) {
  console.log(`## ${d.language}\n`);

  if (d.agents.length > 0) {
    console.log('**추천 Agents:**');
    d.agents.forEach(a => console.log(`- \`${a}\``));
    console.log('');
  }

  if (d.rules.length > 0) {
    console.log('**추천 Rules:**');
    d.rules.forEach(r => console.log(`- \`rules/${r}/\``));
    console.log('');
  }

  if (d.skills.length > 0) {
    console.log('**추천 Skills:**');
    d.skills.forEach(s => console.log(`- \`${s}\``));
    console.log('');
  }
}

console.log('---');
console.log('설치: `./install.sh` 실행 후 위 agents/rules가 `~/.claude/`에 링크됩니다.');
