#!/usr/bin/env node

/* Ejecuta cualquier comando de cargo con DATABASE_URL y CARGO_TARGET_DIR
 * alineados a la rama/proyecto actual. */

import { spawn, spawnSync } from 'node:child_process';
import { getBranchDbContext } from './branch-db.mjs';

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

const cargoArgs = process.argv.slice(2);
if (cargoArgs.length === 0) {
  console.error('Uso: node scripts/run-with-db.mjs <subcomando cargo> [...args]');
  process.exit(1);
}

console.log('');
const { dbUrl, cargoTargetDir } = getBranchDbContext();
console.log('');

/* [16AA-9 F3] El portátil ya no lleva toolchain de Rust (retirado el
 * 2026-10-16): este script no compila. Se sale en claro en vez de fallar con un
 * ENOENT de cargo. PROYECTO TASKS no tiene `scripts/run-cargo.mjs` ni está dado
 * de alta en el taller: hasta que se le dé de alta (AGENTS §2), su código Rust
 * solo se puede compilar en la 89 a mano. */
if (spawnSync(cargoCommand(), ['--version'], { encoding: 'utf8' }).status !== 0) {
  console.error('[db] No hay cargo en el portátil (toolchain retirado el 2026-10-16).');
  console.error('[db] PROYECTO TASKS no tiene run-cargo.mjs ni alta en el taller:');
  console.error('[db]   Arranque alta "PROYECTO TASKS"   (AGENTS §2) antes de compilarlo.');
  process.exit(1);
}

const child = spawn(cargoCommand(), cargoArgs, {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: dbUrl, CARGO_TARGET_DIR: cargoTargetDir },
  shell: false,
});

child.on('error', (err) => {
  console.error('[run-with-db] Error:', err.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 0));
