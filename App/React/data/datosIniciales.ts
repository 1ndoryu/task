/*
 * Datos Iniciales del Dashboard
 * Datos de demostracion usados cuando no hay datos en localStorage
 * Responsabilidad unica: proporcionar datos de ejemplo
 */

import type {Habito, Tarea, Proyecto} from '../types/dashboard';
import {crearFechaHaceNDias} from '../utils/fecha';

/*
 * Habitos de demostracion
 * 3 habitos con diferentes estados:
 * - Uno atrasado (no completado ayer, deberia haberse hecho)
 * - Uno para mañana (proximo segun frecuencia)
 * - Uno para dentro de 3 dias
 */
export const habitosIniciales: Habito[] = [
    {
        id: 1,
        nombre: 'Deep Work / Coding',
        importancia: 'Alta',
        diasInactividad: 3,
        racha: 0,
        tags: ['dev', 'focus'],
        historialCompletados: [crearFechaHaceNDias(5), crearFechaHaceNDias(4), crearFechaHaceNDias(3)],
        ultimoCompletado: crearFechaHaceNDias(3),
        fechaCreacion: crearFechaHaceNDias(30),
        frecuencia: {tipo: 'diario'}
    },
    {
        id: 2,
        nombre: 'Lectura Tecnica',
        importancia: 'Media',
        diasInactividad: 0,
        racha: 5,
        tags: ['learning'],
        historialCompletados: [crearFechaHaceNDias(10), crearFechaHaceNDias(8), crearFechaHaceNDias(6), crearFechaHaceNDias(4), crearFechaHaceNDias(2), crearFechaHaceNDias(0)],
        ultimoCompletado: crearFechaHaceNDias(0),
        fechaCreacion: crearFechaHaceNDias(14),
        frecuencia: {tipo: 'cadaXDias', cadaDias: 2}
    },
    {
        id: 3,
        nombre: 'Ejercicio Fisico',
        importancia: 'Baja',
        diasInactividad: 1,
        racha: 8,
        tags: ['salud'],
        historialCompletados: [crearFechaHaceNDias(13), crearFechaHaceNDias(10), crearFechaHaceNDias(7), crearFechaHaceNDias(4), crearFechaHaceNDias(1)],
        ultimoCompletado: crearFechaHaceNDias(1),
        fechaCreacion: crearFechaHaceNDias(20),
        frecuencia: {tipo: 'cadaXDias', cadaDias: 3}
    }
];

/*
 * Tareas de demostracion para usuarios nuevos
 * 3 tareas genéricas de bienvenida que guían al usuario
 * - Una de alta prioridad (explorar la app)
 * - Una de media prioridad (configurar preferencias)
 * - Una de baja prioridad (opcional pero recomendada)
 */
export const tareasIniciales: Tarea[] = [
    {
        id: 1,
        /* sentinel-disable-next-line emoji-en-codigo — emoji en texto visible para el usuario */
        texto: '👋 ¡Bienvenido! Explora el dashboard',
        completado: false,
        prioridad: 'alta',
        urgencia: 'urgente',
        fechaCreacion: crearFechaHaceNDias(0),
        configuracion: {
            descripcion: 'Haz clic en esta tarea para ver cómo funciona. Puedes agregar descripciones, fechas límite, subtareas y más. Usa el check de la izquierda para completarla.'
        }
    },
    {
        id: 2,
        texto: 'Crea tu primer hábito',
        completado: false,
        prioridad: 'media',
        fechaCreacion: crearFechaHaceNDias(0),
        configuracion: {
            descripcion: 'Los hábitos son actividades recurrentes que quieres hacer regularmente. Ve al panel de Hábitos y crea uno con el botón "+".'
        }
    },
    {
        id: 3,
        texto: 'Personaliza tu experiencia (opcional)',
        completado: false,
        prioridad: 'baja',
        fechaCreacion: crearFechaHaceNDias(0),
        configuracion: {
            descripcion: 'Usa el menú de tu perfil (arriba a la derecha) para cambiar el tema, configurar tu zona horaria y explorar las opciones de seguridad.'
        }
    }
];

/*
 * Notas iniciales del scratchpad - Nota de bienvenida Beta
 */
/* sentinel-disable-next-line emoji-en-codigo — contenido Markdown con emojis decorativos, no se pueden reemplazar con SVG en strings */
export const notasIniciales = `# ¡Bienvenido a la Beta de Nakomi Task! 🎉

Gracias por unirte a nuestra primera beta abierta. Este proyecto está hecho con mucho cariño, pensando en una gestión de tareas y hábitos **inteligente y minimalista**.

## 🎁 Tu regalo de bienvenida

Durante esta beta (Enero 2026), te regalamos **30 días gratis** sin necesidad de tarjeta de crédito para que pruebes todas las funciones:

- ✅ Copias de seguridad cada 30 minutos
- ✅ Cifrado de archivos  
- ✅ 1 GB de almacenamiento (expandiremos con el tiempo)
- ✅ Envío de comentarios y sugerencias

## ⚠️ Importante

Al ser una beta, podrían existir bugs o pérdida de datos. Trabajamos duro para que esto no suceda, pero te recomendamos usar las copias de seguridad.

## 🚀 Próximamente

- Sistema de trabajo en equipos
- Plugins personalizados
- Integración más profunda con IA (con opción de desactivarla si prefieres trabajo 100% humano)

## 💬 Tu opinión es oro

Esperamos tus sugerencias, reportes de bugs, ideas locas... ¡todo es bienvenido! Leeremos cada comentario.

---

*— Wandorius, Founder de Nakomi*`;

/*
 * Proyectos de demostracion
 * Array vacío por defecto para usuarios nuevos
 * El usuario creará sus propios proyectos cuando esté listo
 */
export const proyectosIniciales: Proyecto[] = [];

/*
 * Tareas de proyectos de demostracion
 * Array vacío porque no hay proyectos iniciales
 */
export const tareasProyectosIniciales: Tarea[] = [];
