#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'frontend', 'src');
const excluded = new Set(['app', 'glory-core', 'api/generated']);
const forbidden = [/wp-json/i, /x-wp-nonce/i, /gloryDashboard/i, /localStorage/i];
const violations = [];

const orvalConfig = await readFile(join(process.cwd(), 'frontend', 'orval.config.ts'), 'utf8');
if (!/mode:\s*['"]tags-split['"]/.test(orvalConfig)) {
  console.error('Frontend boundary check: Orval debe usar mode tags-split.');
  process.exit(1);
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relativePath = relative(root, path).replaceAll('\\', '/');
    if ([...excluded].some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`))) continue;
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const content = await readFile(path, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(content)) violations.push(`${relativePath}: ${pattern}`);
    }
  }
}

await visit(root);
if (violations.length > 0) {
  console.error('Frontend integrado contiene contratos WordPress o almacenamiento inseguro:');
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Frontend boundary check: OK');
