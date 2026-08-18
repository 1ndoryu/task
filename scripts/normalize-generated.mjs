#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'frontend', 'src', 'api', 'generated');

async function normalize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalize(path);
      continue;
    }
    if (entry.name.endsWith('.ts')) {
      const source = await readFile(path, 'utf8');
      await writeFile(path, `${source.trimEnd()}\n`, 'utf8');
    }
  }
}

await normalize(root);
console.log(`Cliente Orval normalizado en ${root}`);
