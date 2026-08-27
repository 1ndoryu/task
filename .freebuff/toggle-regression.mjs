const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const registrarActividadToggle = (estadoAnterior) =>
  estadoAnterior ? 'tarea_desmarcada' : 'tarea_completada';

const casos = [
  [false, 'tarea_completada'],
  [true, 'tarea_desmarcada'],
  [false, 'tarea_desmarcada', true],
  [true, 'tarea_completada', true]
];

assert(registrarActividadToggle(false) === 'tarea_completada', 'completar debe registrar completada');
assert(registrarActividadToggle(true) === 'tarea_desmarcada', 'desmarcar debe registrar desmarcada');

for (const [anterior, esperado, deshacer] of casos) {
  const estado = deshacer ? !anterior : anterior;
  assert(registrarActividadToggle(estado) === esperado, `toggle ${estado} debe registrar ${esperado}`);
}

console.log('toggle-regression: OK');
