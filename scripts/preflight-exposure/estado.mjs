/* Estado compartido del preflight: destinos, reporte, cookies y usuario temporal.
 * Es un objeto mutado por propiedades: ESM no propaga reasignaciones de bindings importados. */
export const estado = {
  baseUrl: null,
  psql: null,
  database: null,
  report: null,
  cookies: new Map(),
  userId: undefined,
  cleanupUserIds: new Set(),
};
