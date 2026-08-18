#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const output = 'frontend/src/api/openapi.json';
const source = await readFile(output, 'utf8');
const document = JSON.parse(source.replaceAll(
  '#/components/schemas/crate.errors.ErrorResponse',
  '#/components/schemas/ErrorResponse',
));

for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  const tag = path.startsWith('/api/auth/') ? 'auth'
    : path.startsWith('/api/profile') ? 'profile'
      : path.startsWith('/api/notes') ? 'notes'
        : path.startsWith('/api/dashboard') ? 'dashboard'
          : 'health';
  for (const operation of Object.values(pathItem)) {
    if (operation && typeof operation === 'object' && 'responses' in operation) {
      operation.tags ??= [tag];
    }
  }
}

await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`OpenAPI snapshot normalizado en ${output}`);
