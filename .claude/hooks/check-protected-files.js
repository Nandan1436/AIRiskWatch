#!/usr/bin/env node
/**
 * PreToolUse hook — blocks agent edits to protected files.
 * Reads tool input JSON from stdin; exits 1 (blocked) or 0 (allowed).
 */

const path = require('path');

// Normalise separators for consistent matching
function norm(p) {
  return p.replace(/\\/g, '/');
}

// ── CRITICAL: block outright ─────────────────────────────────────────────────
const CRITICAL = [
  // Backend / root environment files
  {
    re: /(^|\/)\.env(?:\.(?!example$).*)?$/i,
    label: 'environment variables file (may contain secrets)',
  },

  // Frontend environment files
  {
    re: /(^|\/)frontend\/\.env(?:\.(?!example$).*)?$/i,
    label: 'frontend environment variables file (may contain secrets)',
  },
];

// ── HIGH: also blocked — require explicit human action ───────────────────────
const HIGH = [
  { re: /(^|\/)\.gitignore$/i, label: '.gitignore' },
  { re: /(^|\/)\.gitattributes$/i, label: '.gitattributes' },
  { re: /(^|\/)Dockerfile$/i, label: 'Dockerfile' },
  { re: /(^|\/)compose\.yaml$/i, label: 'Docker Compose file' },
  { re: /(^|\/)compose\.yml$/i, label: 'Docker Compose file' },
  {
    re: /DockerCompose\/.*\.(sh|bat)$/i,
    label: 'Docker startup/restore script',
  },
  {
    re: /Infrastructure\/.*\.(sh|yaml|yml)$/i,
    label: 'infrastructure config/script',
  },
  { re: /\.sln$/i, label: 'Visual Studio solution file' },
  {
    re: /\.github\/workflows\//i,
    label: 'CI/CD pipeline file',
  },
  {
    re: /\.github\/pull_request_template\.md$/i,
    label: 'PR template',
  },
  {
    re: /\.claude\/settings(?:\.local)?\.json$/i,
    label: 'Claude Code settings file',
  },
];

function main() {
  let raw = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    raw += chunk;
  });

  process.stdin.on('end', () => {
    let filePath = '';

    try {
      const input = JSON.parse(raw);
      filePath = (input.tool_input && input.tool_input.file_path) || '';
    } catch {
      // Unparseable input — allow through
      process.exit(0);
    }

    if (!filePath) {
      process.exit(0);
    }

    const normalised = norm(filePath);

    // Check CRITICAL files
    for (const { re, label } of CRITICAL) {
      if (re.test(normalised)) {
        console.error(
          `[protected-files] BLOCKED: "${path.basename(filePath)}" is a ${label}.\n` +
          `  Coding agents must never modify this file.\n` +
          `  See Docs/Core/14-protected-files.md for the full list.`
        );

        process.exit(1);
      }
    }

    // Check HIGH files
    for (const { re, label } of HIGH) {
      if (re.test(normalised)) {
        console.error(
          `[protected-files] BLOCKED: "${path.basename(filePath)}" is a ${label}.\n` +
          `  This file requires explicit human action — make the change manually.\n` +
          `  See Docs/Core/14-protected-files.md for the full list.`
        );

        process.exit(1);
      }
    }

    process.exit(0);
  });
}

main();