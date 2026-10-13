/* Comprobaciones operativas: sesión expirada, rate limit, EXPLAIN, timeout de petición y carga. */

import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { request, runPsql, psqlArgs, sql, sleep } from './transporte.mjs';
import { estado } from './estado.mjs';

export async function checkExpiredSessionCleanup(id) {
  const token = `expired-${randomUUID()}`;
  const csrf = `csrf-${randomUUID()}`;
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  runPsql(`
    INSERT INTO auth_sessions (id, user_id, token_hash, csrf_hash, expires_at)
    VALUES ('${randomUUID()}'::uuid, '${sql(id)}'::uuid, '${hash(token)}', '${hash(csrf)}', NOW() - INTERVAL '1 minute');
  `);
  const response = await request('/api/auth/me', { cookie: `session_id=${token}` });
  const remaining = runPsql(`SELECT COUNT(*) FROM auth_sessions WHERE token_hash = '${hash(token)}';`).trim();
  estado.report.checks.expiredSession = { status: response.status, remaining };
  if (response.status !== 401 || remaining !== '0') throw new Error('sesión expirada no fue revocada al validarse');
}

export async function checkRateLimit() {
  const statuses = [];
  for (let index = 0; index < 12; index += 1) {
    const response = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `wrong-${randomUUID()}@example.test`, password: 'wrong-password' }),
      cookie: '',
    });
    statuses.push(response.status);
  }
  estado.report.checks.rateLimit = statuses;
  if (!statuses.includes(429)) throw new Error('rate limit no produjo 429 en single-replica');
}

export async function collectExplain(id) {
  const queries = {
    dashboardTasks: `SELECT * FROM dashboard_tasks WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    dashboardProjects: `SELECT * FROM dashboard_projects WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    dashboardHabits: `SELECT * FROM dashboard_habits WHERE user_id = '${sql(id)}'::uuid AND deleted_at IS NULL ORDER BY sort_order, legacy_id LIMIT 501`,
    activity: `SELECT date, type, COUNT(*) FROM activity_events WHERE user_id = '${sql(id)}'::uuid AND date BETWEEN CURRENT_DATE - INTERVAL '364 days' AND CURRENT_DATE GROUP BY date, type ORDER BY date, type`,
    notesSearch: `SELECT * FROM notes WHERE user_id = '${sql(id)}'::uuid AND (title ILIKE '%searchable%' OR content ILIKE '%searchable%') ORDER BY created_at DESC LIMIT 100`,
  };
  for (const [name, query] of Object.entries(queries)) {
    const raw = runPsql(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query};`).trim();
    estado.report.explain[name] = JSON.parse(raw);
  }
}

export async function checkRequestTimeout(id) {
  /* El 408 requiere que el lock esté tomado antes del request y que el backend corra
   * con REQUEST_TIMEOUT_SECONDS menor que la duración del lock (por ejemplo 3 < 6).
   * Un sleep fijo no basta: psql puede tardar más en adquirir el lock (Windows/SCRAM),
   * por eso se espera de forma determinista a que el lock aparezca en pg_locks. */
  const lockSql = `BEGIN; LOCK TABLE dashboard_tasks IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(6); COMMIT;`;
  const child = spawn(estado.psql, psqlArgs(lockSql), { env: estado.database.env, stdio: 'ignore', windowsHide: true });
  if (!(await waitForTableLock('dashboard_tasks', 5000))) {
    child.kill();
    throw new Error('el fixture de timeout no pudo adquirir el lock de dashboard_tasks a tiempo');
  }
  const response = await request('/api/dashboard', { timeoutMs: 10_000 });
  await new Promise((resolve) => child.once('exit', resolve));
  estado.report.checks.requestTimeout = response.status;
  if (response.status !== 408) throw new Error(`request timeout esperaba 408 y recibió ${response.status}`);
  void id;
}

async function waitForTableLock(table, maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const row = runPsql(
      `SELECT COUNT(*) FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
       WHERE c.relname = '${sql(table)}' AND l.mode = 'AccessExclusiveLock'`,
    ).trim();
    if (row === '1') return true;
    await sleep(100);
  }
  return false;
}

export async function runLoad(args) {
  const samples = [];
  const deadline = Date.now() + args.durationSeconds * 1000;
  const intervalMs = (1000 * args.users) / args.rps;
  async function worker() {
    while (Date.now() < deadline) {
      const started = performance.now();
      const response = await request('/api/dashboard', { timeoutMs: 10_000 });
      samples.push({ status: response.status, ms: Number((performance.now() - started).toFixed(2)) });
      await sleep(Math.max(0, intervalMs - (performance.now() - started)));
    }
  }
  await Promise.all(Array.from({ length: args.users }, () => worker()));
  const latencies = samples.map((sample) => sample.ms).sort((left, right) => left - right);
  const percentile = (fraction) => latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))];
  return {
    samples: samples.length,
    errors: samples.filter((sample) => sample.status !== 200).length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    statuses: Object.fromEntries([...new Set(samples.map((sample) => sample.status))].map((status) => [status, samples.filter((sample) => sample.status === status).length])),
  };
}
