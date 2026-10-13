#!/usr/bin/env node

/* Preflight de exposición. Por defecto solo admite loopback y una base
 * explícitamente temporal mediante PREFLIGHT_DATABASE_URL. Un destino no local
 * requiere una bandera CLI y confirmaciones de entorno independientes. */

import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { findPsql } from './branch-db.mjs';
import { estado } from './preflight-exposure/estado.mjs';
import { checkTeamContracts } from './preflight-exposure/equipos.mjs';
import { checkSharedProjectionContracts } from './preflight-exposure/compartidos.mjs';
import { checkCorsAndCookies, checkHttpBasics, checkIdentityContracts, checkNoteContracts, checkTaskHierarchyContracts, registerTemporaryUser, seedFixture } from './preflight-exposure/contratos.mjs';
import { checkExpiredSessionCleanup, checkRateLimit, checkRequestTimeout, collectExplain, runLoad } from './preflight-exposure/operativos.mjs';
import { parseArgs, parseDatabaseUrl, runPsql, sql, validateExposureTargets } from './preflight-exposure/transporte.mjs';

const args = parseArgs(process.argv.slice(2));
estado.baseUrl = args.baseUrl.replace(/\/$/, '');
estado.psql = findPsql();
estado.database = parseDatabaseUrl(process.env.PREFLIGHT_DATABASE_URL);
validateExposureTargets(estado.baseUrl, estado.database, args);
const reportPath = args.report || `temp/preflight-report-${new Date().toISOString().replaceAll(':', '-')}.json`;
estado.report = {
  startedAt: new Date().toISOString(),
  baseUrl: estado.baseUrl,
  parameters: { users: args.users, rps: args.rps, durationSeconds: args.durationSeconds },
  checks: {},
  explain: {},
  load: null,
  failures: [],
};

try {
  if (!estado.psql) throw new Error('psql no está disponible en PATH ni en Program Files/PostgreSQL');

  await checkHttpBasics();
  estado.userId = await registerTemporaryUser();
  estado.cleanupUserIds.add(estado.userId);
  await seedFixture(estado.userId);
  await checkNoteContracts();
  await checkTaskHierarchyContracts();
  await checkTeamContracts();
  await checkSharedProjectionContracts();
  await checkIdentityContracts();
  await checkCorsAndCookies();
  await checkExpiredSessionCleanup(estado.userId);
  await checkRateLimit();
  await collectExplain(estado.userId);
  if (process.env.PREFLIGHT_SKIP_TIMEOUT_FIXTURE === 'true') {
    estado.report.checks.requestTimeout = 'skipped by PREFLIGHT_SKIP_TIMEOUT_FIXTURE';
  } else {
    await checkRequestTimeout(estado.userId);
  }
  estado.report.load = await runLoad(args);
  if (estado.report.load.errors > 0 || estado.report.load.p95Ms >= 300) {
    throw new Error(`carga fuera de umbral: errores=${estado.report.load.errors}, p95=${estado.report.load.p95Ms}ms`);
  }
} catch (error) {
  estado.report.failures.push(error instanceof Error ? error.message : String(error));
} finally {
  if (estado.cleanupUserIds.size > 0) {
    try {
      runPsql(`DELETE FROM users WHERE id IN (${[...estado.cleanupUserIds].map((id) => `'${sql(id)}'::uuid`).join(', ')});`);
      runPsql("DELETE FROM users WHERE email LIKE 'preflight-team-page-%@example.test';");
      estado.report.cleaned = true;
    } catch (error) {
      estado.report.cleaned = false;
      estado.report.failures.push(`cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  estado.report.finishedAt = new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(estado.report, null, 2)}\n`, 'utf8');
}

if (estado.report.failures.length > 0) {
  console.error(`Preflight FAIL — reporte: ${reportPath}`);
  for (const failure of estado.report.failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Preflight PASS — reporte: ${reportPath}`);
}
