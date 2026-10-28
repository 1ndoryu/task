# Plan — mejoras de TASKS (2026-10-27)

**Método (decidido):** una tarea a la vez. Cada una se implementa, se prueba en el navegador (dev 14191), se muestra a la usuaria y solo con su aprobación se pasa a la siguiente. Orden de menos a más riesgo, salvo la primera, que se pidió con prisa.

| # | ID | Qué | Notas / criterio de hecho |
|---|---|---|---|
| 1 (hecho) | `27AA-1` | Fin de día configurable | Pestaña propia en Ajustes, hora entera 0–23 (como el legacy `horaFinDia`), guardada con las preferencias. `fechaLocal()` pasa a restar esas horas: el «hoy» de hábitos, completados y aplazados cambia; **no** toca los momentos temprano/tarde/noche. Con 3 → a las 02:59 sigue siendo el día anterior. |
| 2 (hecho) | `27AA-2` | Caja nueva con tamaño mínimo | Toda caja nueva (grupo, nota, diario) nace con el tamaño mínimo. |
| 3 | `27AA-3` | Botones de acciones abajo, +1 px; explorador de cajas (hecho) | Acciones al pie de la caja, iconos +1 px. Icono nuevo que abre un panel centrado, no modal (estilo explorador de Windows 11): cada caja con icono y nombre; clic = activar/desactivar (icono atenuado = desactivada). |
| 4 | `27AA-4` | Componente calendario | Reutilizable; se usa en aplazar tarea/hábito y en elegir el día de una entrada del diario (clic en la fecha). |
| 5 | `27AA-5` | Fecha límite en tareas | En configuración de la tarea y en su menú contextual; usa el calendario. Ya existe `configuracion.fechaMaxima` (pesa en el orden). |
| 6 | `27AA-6` | Dependencias (hilo rojo) | Tareas y hábitos, múltiples; desde menú contextual y configuración. Hilo rojo con gravedad que sigue a las filas y cruza entre cajas; muestra qué falta hacer primero. En hábitos la dependencia persiste. Base: `frontend-legacy/.../ModalDependencias.tsx`. |
| 7 | `27AA-7` | Perfil, login y modo invitado | Foto de perfil en los botones flotantes → menú (ver perfil, salir) → modal de usuario; login, registro, recuperar contraseña; invitado con datos **locales (IndexedDB)**. No afecta a la sesión ya iniciada. **Antes de empezar: respaldo verificado.** Dividir en subtareas al llegar. |

## Decisiones
- Fin de día: solo hora entera; se guarda con las preferencias sincronizadas.
- Invitado: base local del navegador/app, migrable luego a cuenta.
- Orden: de menos a más riesgo.
