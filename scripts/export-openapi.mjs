#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = process.env.OPENAPI_URL ?? 'http://localhost:3000/api-docs/openapi.json';
const output = resolve(process.cwd(), 'frontend/src/api/openapi.json');
const response = await fetch(source);
if (!response.ok) {
  throw new Error(`No se pudo obtener OpenAPI (${response.status}) desde ${source}`);
}

const document = await response.json();
const normalized = JSON.parse(JSON.stringify(document).replaceAll(
  '#/components/schemas/crate.errors.ErrorResponse',
  '#/components/schemas/ErrorResponse',
));
for (const [path, pathItem] of Object.entries(normalized.paths ?? {})) {
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
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
console.log(`OpenAPI snapshot escrito en ${output}`);
