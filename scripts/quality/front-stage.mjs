import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Etapa del front (21AA-5): type-check y build en `frontend/`. El gate exige un
// reporte JSON estructurado; aquí cada comando que falla es un hallazgo `error`
// y la etapa sale 0 para que el gate lo clasifique desde el reporte.
const reportPath = process.argv[2];
if (!reportPath) {
  process.stderr.write('front-stage requiere {reportPath}\n');
  process.exit(2);
}

const pasos = [
  { ruleId: 'front-type-check', script: 'type-check' },
  { ruleId: 'front-build', script: 'build' },
];

const findings = [];
for (const paso of pasos) {
  // Un comando por paso: npm sin shell para no concatenar argumentos.
  const r = spawnSync('npm', ['run', paso.script], {
    cwd: path.resolve('frontend'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 600_000,
  });
  if (r.error) {
    process.stderr.write(`No se pudo ejecutar npm: ${r.error.message}\n`);
    process.exit(2);
  }
  if (r.status !== 0) {
    const cola = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ');
    findings.push({
      ruleId: paso.ruleId,
      severity: 'error',
      message: `npm run ${paso.script} falló (exit ${r.status}): ${cola.slice(0, 400)}`,
    });
  }
}

// El reporte va dentro del directorio que el gate asigna; nunca fuera de él.
fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify({
    schemaVersion: '1',
    entries: [{ ruta: 'frontend', findings }],
  }, null, 2),
  'utf8',
);
process.exit(0);
