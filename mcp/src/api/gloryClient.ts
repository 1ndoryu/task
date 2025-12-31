/*
 * Cliente HTTP para la API de Glory
 * Maneja autenticación y peticiones REST
 */

import {config} from '../config.js';
import type {DashboardData, Tarea, DatosNuevaTarea, DatosEdicionTarea} from '../types/dashboard.js';

/* Clase cliente para comunicarse con la API de Glory */
export class GloryClient {
    private baseUrl: string;
    private authHeader: string;

    constructor() {
        this.baseUrl = config.apiUrl;

        /* Construir header de autorización */
        if (config.authToken) {
            /* Token ya viene en Base64 */
            this.authHeader = `Basic ${config.authToken}`;
        } else if (config.wpUsername && config.wpPassword) {
            /* Codificar credenciales */
            const credentials = `${config.wpUsername}:${config.wpPassword}`;
            const encoded = Buffer.from(credentials).toString('base64');
            this.authHeader = `Basic ${encoded}`;
        } else {
            // console.error('[MCP Glory] Faltan credenciales de autenticación');
            this.authHeader = '';
        }
    }

    /* Método genérico para peticiones GET */
    private async get<T>(endpoint: string): Promise<T> {
        /* Timeout de 5 segundos para evitar bloqueos */
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Timeout: La petición tardó más de 5 segundos');
            }
            throw error;
        }
    }

    /* Método genérico para peticiones POST */
    private async post<T>(endpoint: string, data: unknown): Promise<T> {
        /* Timeout de 5 segundos para evitar bloqueos */
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Timeout: La petición tardó más de 5 segundos');
            }
            throw error;
        }
    }

    /*
     * Obtiene todos los datos del dashboard
     * Incluye tareas, proyectos y hábitos
     */
    async obtenerDashboard(): Promise<DashboardData> {
        const response = await this.get<{success: boolean; data: DashboardData}>('/dashboard');
        return response.data;
    }

    /* Guarda los datos completos del dashboard */
    async guardarDashboard(data: DashboardData): Promise<{success: boolean}> {
        return this.post<{success: boolean}>('/dashboard', data);
    }

    /*
     * Push de cambios incrementales
     * Usado para operaciones individuales
     */
    /*
     * Push de cambios incrementales
     * Usado para operaciones individuales
     */
    async pushCambios(cambios: unknown[]): Promise<{success: boolean}> {
        return this.post<{success: boolean}>('/dashboard/changes', {
            changes: cambios,
            clientTimestamp: Date.now()
        });
    }

    /* Obtiene todas las tareas */
    async obtenerTareas(): Promise<Tarea[]> {
        const data = await this.obtenerDashboard();
        return data.tareas || [];
    }

    /* Obtiene tareas filtradas */
    async obtenerTareasFiltradas(filtro: 'pendientes' | 'completadas' | 'todas'): Promise<Tarea[]> {
        const tareas = await this.obtenerTareas();

        switch (filtro) {
            case 'pendientes':
                return tareas.filter(t => !t.completado);
            case 'completadas':
                return tareas.filter(t => t.completado);
            default:
                return tareas;
        }
    }

    /* Obtiene tareas de un proyecto específico */
    async obtenerTareasProyecto(proyectoId: number): Promise<Tarea[]> {
        const tareas = await this.obtenerTareas();
        return tareas.filter(t => t.proyectoId === proyectoId);
    }

    /* Obtiene una tarea por ID */
    async obtenerTarea(id: number): Promise<Tarea | null> {
        const tareas = await this.obtenerTareas();
        return tareas.find(t => t.id === id) || null;
    }

    /* Crea una nueva tarea */
    async crearTarea(datos: DatosNuevaTarea): Promise<Tarea> {
        const dashboard = await this.obtenerDashboard();
        const tareas = dashboard.tareas || [];

        /* Generar nuevo ID */
        const maxId = tareas.reduce((max, t) => Math.max(max, t.id), 0);
        // Usar timestamp si maxId es 0 para evitar conflictos con datos no cargados
        const nuevoId = maxId > 0 ? maxId + 1 : Math.floor(Date.now() / 1000);

        const nuevaTarea: Tarea = {
            id: nuevoId,
            texto: datos.texto,
            completado: false,
            fechaCreacion: new Date().toISOString(),
            prioridad: datos.prioridad,
            urgencia: datos.urgencia,
            configuracion: datos.configuracion,
            proyectoId: datos.proyectoId,
            tags: datos.tags
        };

        /* Usar endpoint incremental para no borrar otros datos */
        await this.pushCambios([
            {
                type: 'create',
                entity: 'tarea',
                clientTimestamp: Date.now(),
                data: nuevaTarea
            }
        ]);

        return nuevaTarea;
    }

    /* Edita una tarea existente */
    async editarTarea(id: number, datos: DatosEdicionTarea): Promise<Tarea | null> {
        const tareaExistente = await this.obtenerTarea(id);

        if (!tareaExistente) {
            // Intentamos construir una actualización parcial si no tenemos la tarea completa,
            // pero es arriesgado. Mejor devolver null si no la encontramos.
            // O podríamos hacer un patch ciego si la API lo soportara mejor.
            return null;
        }

        const tareaActualizada = {...tareaExistente};

        if (datos.texto !== undefined) tareaActualizada.texto = datos.texto;
        if (datos.prioridad !== undefined) {
            tareaActualizada.prioridad = datos.prioridad ?? undefined;
        }
        if (datos.urgencia !== undefined) {
            tareaActualizada.urgencia = datos.urgencia ?? undefined;
        }
        if (datos.completado !== undefined) {
            tareaActualizada.completado = datos.completado;
            if (datos.completado) {
                tareaActualizada.fechaCompletado = new Date().toISOString();
            } else {
                tareaActualizada.fechaCompletado = undefined;
            }
        }
        if (datos.configuracion !== undefined) {
            tareaActualizada.configuracion = datos.configuracion;
        }
        if (datos.proyectoId !== undefined) {
            tareaActualizada.proyectoId = datos.proyectoId;
        }
        if (datos.tags !== undefined) {
            tareaActualizada.tags = datos.tags;
        }

        await this.pushCambios([
            {
                type: 'update',
                entity: 'tarea',
                clientTimestamp: Date.now(),
                data: tareaActualizada
            }
        ]);

        return tareaActualizada;
    }

    /* Marca/desmarca tarea como completada */
    async toggleCompletarTarea(id: number): Promise<Tarea | null> {
        const tarea = await this.obtenerTarea(id);
        if (!tarea) return null;

        return this.editarTarea(id, {completado: !tarea.completado});
    }

    /* Elimina una tarea */
    async eliminarTarea(id: number): Promise<boolean> {
        await this.pushCambios([
            {
                type: 'delete',
                entity: 'tarea',
                clientTimestamp: Date.now(),
                data: {id}
            }
        ]);

        return true;
    }
}

/* Singleton del cliente */
export const gloryClient = new GloryClient();
