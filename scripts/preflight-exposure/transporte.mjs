/* Transporte del preflight: peticiones HTTP a la API, psql y validación de destinos. */

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { estado } from './estado.mjs';

export function request(path, options = {}) {
  const { cookieJar = estado.cookies, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (fetchOptions.cookie !== undefined) headers.set('cookie', fetchOptions.cookie);
  else if (cookieJar.size > 0) headers.set('cookie', [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchOptions.timeoutMs || 10_000);
  return fetch(`${estado.baseUrl}${path}`, { ...fetchOptions, headers, signal: controller.signal })
    .then(async (response) => {
      const setCookie = response.headers.get('set-cookie') || '';
      for (const match of setCookie.matchAll(/(?:^|,\s*)(session_id|csrf_token)=([^;,]+)/g)) cookieJar.set(match[1], match[2]);
      return { status: response.status, body: await response.text(), headers: response.headers, setCookie };
    })
    .finally(() => clearTimeout(timeout));
}

export function runPsql(query) {
  const result = spawnSync(estado.psql, psqlArgs(query), { encoding: 'utf8', env: estado.database.env, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`psql falló: ${result.stderr.trim()}`);
  return result.stdout;
}

export function psqlArgs(query) {
  return ['-h', estado.database.host, '-p', String(estado.database.port), '-U', estado.database.user, '-d', estado.database.name, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', query];
}

export function parseDatabaseUrl(value) {
  if (!value) throw new Error('PREFLIGHT_DATABASE_URL es obligatorio y debe apuntar a una base temporal');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PREFLIGHT_DATABASE_URL no es PostgreSQL');
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    name: decodeURIComponent(url.pathname.slice(1)),
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
  };
}

export function parseArgs(values) {
  const result = { baseUrl: 'http://127.0.0.1:3000', users: 20, rps: 10, durationSeconds: 300, report: undefined, allowNonLoopback: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const next = values[index + 1];
    if (value === '--base-url') result.baseUrl = next;
    else if (value === '--users') result.users = Number(next);
    else if (value === '--rps') result.rps = Number(next);
    else if (value === '--duration-seconds') result.durationSeconds = Number(next);
    else if (value === '--report') result.report = next;
    else if (value === '--allow-non-loopback') result.allowNonLoopback = true;
    else throw new Error(`argumento desconocido: ${value}`);
    if (value !== '--allow-non-loopback') index += 1;
  }
  if (!Number.isInteger(result.users) || result.users < 1 || !Number.isFinite(result.rps) || result.rps <= 0 || !Number.isInteger(result.durationSeconds) || result.durationSeconds < 1) throw new Error('users, rps y duration-seconds deben ser positivos');
  return result;
}

export function validateExposureTargets(target, databaseConfig, options) {
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    throw new Error('--base-url debe ser una URL absoluta');
  }
  const targetLoopback = isLoopback(targetUrl.hostname);
  const databaseLoopback = isLoopback(databaseConfig.host);
  const explicitNonLoopback = options.allowNonLoopback
    && process.env.PREFLIGHT_ALLOW_NON_LOOPBACK === 'I_UNDERSTAND_NON_LOOPBACK_PREFLIGHT'
    && process.env.PREFLIGHT_CONFIRM_BASE_URL === target
    && process.env.PREFLIGHT_CONFIRM_DATABASE_URL === process.env.PREFLIGHT_DATABASE_URL;
  if ((targetLoopback && databaseLoopback) || explicitNonLoopback) return;
  throw new Error('preflight bloqueado: base y URL deben ser loopback; para un destino no local exige --allow-non-loopback, PREFLIGHT_ALLOW_NON_LOOPBACK=I_UNDERSTAND_NON_LOOPBACK_PREFLIGHT, PREFLIGHT_CONFIRM_BASE_URL y PREFLIGHT_CONFIRM_DATABASE_URL coincidentes');
}

function isLoopback(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

export function expectStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} esperaba ${expected} y recibió ${response.status}`);
}

export function sql(value) {
  return String(value).replaceAll("'", "''");
}

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
