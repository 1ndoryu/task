# Auditoría SOLID del frontend (2026-10-28)

Alcance: `frontend/src` (vista, lógica, estilos). Disparador: la caja «Archivados» no se redimensionaba y el calendario se abría sin fondo oscuro, a diferencia de Ajustes. Los dos fallos tenían la misma raíz: **una pieza de interfaz reimplementada a mano en vez de pasar por la carcasa común**, así que no heredaba lo que la carcasa da gratis.

## Corregido en 27AA-10

| Principio | Hallazgo | Corrección |
|---|---|---|
| DRY / OCP | `Caja`, `CajaNota` repetían la carcasa `section.caja` (tamaño de usuario, `caja--crecida`, minimizada, `data-panel`, asa); `Archivados` no la tenía y por eso no tenía asa ni tamaño. | `vista/CarcasaCaja.tsx`: una sola carcasa; las tres cajas (y `CajaDiario` vía `CajaNota`) la usan. Archivados guarda su tamaño en `preferencias.tamanos['sistema:archivados']`. |
| DRY / SRP | Tres implementaciones de «ventana modal»: `Modal` y `Ajustes` (`<dialog>` duplicado línea a línea) y `Calendario` (portal + clic fuera + Escape a mano, sin `::backdrop`). | `vista/Dialogo.tsx` (`<dialog>` nativo + cierre fuera + Escape). `Modal`, `Ajustes` y `Calendario` la usan; el calendario ya tiene fondo y foco atrapado. |
| SRP | `Lista.tsx` escribía el cambio de tamaño en línea dentro de un `onTamano` anónimo. | Función `cambiarTamano` única, compartida por todas las cajas. |

## Corregido en 27AA-11

| Principio | Hallazgo | Corrección |
|---|---|---|
| DRY | «Cerrar al pulsar fuera» repetido en `ExploradorCajas`, `Menu`, `NuevaFila` y `Selector`. | `vista/usarCierreFuera.ts`: un hook con los nodos «dentro», Escape (en captura si hace falta). Los cuatro lo usan; `Selector` conserva su cierre al desplazar. |
| OCP (parcial) | `Paneles.tsx` y `ConfirmarPanel.tsx` ramificaban por `panel.tipo`; `ContenidoPanel` repetía tres veces `tamano`/`onTamano`. | `Paneles.tsx`: tabla `TIPOS` (icono, `seBorra`); `ConfirmarPanel` pregunta `seBorra`. `ContenidoPanel` agrupa la medida en `medida`. |

## Pendiente (no corregido; candidato a tarea)

1. **OCP, `ContenidoPanel.tsx` (207 líneas) y `Lista.tsx`:** ramifican por `panel.tipo` (`'diario'`, `'nota'`, lista) y repiten tres veces `tamano={redimensionable ? …}`/`onTamano`. Otros `if (tipo === …)` dispersos: `cajasActivas.ts:11,21`, `Paneles.tsx:15-23`, `menuPanel.tsx:37`, `usarVista.ts:113,118`, `ConfirmarPanel.tsx:24`. Un tipo nuevo obliga a tocar ~8 sitios. Solución: registro `tipo → {icono, contenido, seBorra, menú}`.
1b. **OCP, Archivados como caso especial:** `PANEL_ARCHIVADOS` se consulta en `Lista.tsx` (272, 285), `usarPaneles.ts:106`; la pestaña se añade a mano. Debería ser un panel de sistema del registro anterior.
2. **ISP, Props anchas:** `Modales.tsx` (24 campos), `Caja.tsx` (22), `ContenidoPanel.tsx` (21), `Fila.tsx` (14). Los componentes reciben callbacks que no usan; agrupar en contextos (`AccionesFila` ya es el patrón correcto).
3. **SRP, archivos grandes:** `usarLista.ts` 389, `Lista.tsx` 341, `usarNotas.ts` 342, `preferencias.ts` 333, `Iconos.tsx` 316, `Ajustes.tsx` 301, `usarArrastreFilas.ts` 299.
4. **DIP:** `Lista.tsx` importa componentes concretos (`Archivados`, `Carril`, `ContenidoPanel`) y lee `localStorage`-derived preferencias directamente; `tamanoDefecto` depende de tokens CSS leídos con `getComputedStyle` (acoplamiento implícito entre `tamano.ts` y la hoja).

## Liskov

Sin violaciones claras: las cajas son intercambiables como hijos del carril salvo `Archivados`, que antes no cumplía el contrato implícito (`tamano`/`onTamano`/asa) y ahora sí.
