#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const output = resolve(process.cwd(), 'frontend/src/api/openapi.json');
const { stdout } = await execFileAsync(cargo, ['run', '--quiet', '--bin', 'export-openapi'], {
  cwd: process.cwd(),
  maxBuffer: 1024 * 1024 * 4,
});
await writeFile(output, `${stdout.trim()}\n`, 'utf8');
console.log(`OpenAPI local escrito en ${output}`);
