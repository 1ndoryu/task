/* Verificación end-to-end de los dominios de paridad (18-08-2026).
 * Recorre el ciclo de vida real de cada dominio contra el backend en vivo
 * y falla con código 1 si algún assert no se cumple. */
/* [25-08-2026] Puerto 3001: el backend de este proyecto vive en 3001 (ver
 * .freebuff/run.md — 3000 lo usan otros proyectos). El default 3000 daba
 * "fetch failed" en cada run sin PARITY_BASE_URL. */
/* [25-08-2026] Normalización de la base: PARITY_BASE_URL puede venir como
 * 'http://host:puerto' o 'http://host:puerto/api'; sin el sufijo /api todas
 * las rutas dan 404 con body vacío (fallo silencioso). Se añade /api si falta. */
/* Orquestador: la infraestructura vive en verify-parity-infra.mjs y las
 * secciones en verify-parity-sesion-almacen.mjs, verify-parity-equipos-contrasena.mjs
 * y verify-parity-preferencias-actividad.mjs. Este archivo fija el orden de ejecución. */
import {estado} from './verify-parity-infra.mjs';
import {
  registroSesion, suscripcion, almacenamientoAdjuntos, backups, feedback,
  cifradoE2E, tokensMcp, timelineWebSocket
} from './verify-parity-sesion-almacen.mjs';
import {compartidos, cambioContrasena, admin} from './verify-parity-equipos-contrasena.mjs';
import {
  preferencias, paridadActividad, tombstones, preferenciasLww, actividadDerivada
} from './verify-parity-preferencias-actividad.mjs';

async function main() {
  await registroSesion();
  await suscripcion();
  await almacenamientoAdjuntos();
  await backups();
  await feedback();
  await cifradoE2E();
  await tokensMcp();
  await timelineWebSocket();
  await compartidos();
  await cambioContrasena();
  await admin();
  await preferencias();
  await paridadActividad();
  await tombstones();
  await preferenciasLww();
  await actividadDerivada();

  console.log(`\n== RESULTADO: ${estado.pasados} pasados, ${estado.fallados} fallados${estado.omitidos > 0 ? `, ${estado.omitidos} omitidos (proveedor externo)` : ''} ==`);
  if (estado.fallados > 0) {
    console.log('Fallaron:', estado.errores.join(' | '));
    process.exit(1);
  }
}

main().catch(e => { console.error('FALLO DE SCRIPT:', e.message); process.exit(1); });
