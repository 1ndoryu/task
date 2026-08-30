/* Capa de acceso a IndexedDB para el modo offline (sin estado de React).
 * Extraida de useModoOffline para mantener ese hook bajo el limite de lineas.
 * Cada helper abre la conexion compartida y opera sobre la transaccion. */
/* Tipos de operaciones en cola (la capa de datos es la fuente; el hook los
 * re-exporta a sus consumidores para no romper la API publica). */
export type TipoOperacion = 'crear' | 'editar' | 'eliminar' | 'toggle';
export type TipoEntidad = 'tarea' | 'habito' | 'proyecto' | 'nota';

export interface OperacionCola {
    id: number;
    tipo: TipoOperacion;
    entidad: TipoEntidad;
    entidadId?: number;
    datos?: Record<string, unknown>;
    timestamp: number;
    intentos: number;
}

const DB_NAME = 'glory_offline_db';
const DB_VERSION = 1;

/* Nombres de las stores (tablas) */
export const STORES = {
    datos: 'datos_dashboard',
    cola: 'cola_cambios',
    meta: 'metadatos'
} as const;

/* [H-F12-10] Reintentos acotados: cada intento fallido incrementa `intentos`
 * de las operaciones pendientes; tras MAX_INTENTOS fallos se detiene el
 * auto-reintento (forzarSync sigue disponible). */
const MAX_INTENTOS = 5;

/* [H-F12-08] Conexión IndexedDB compartida: antes se abría y cerraba en cada
 * operación (open + close por transacción). La promesa se cachea a nivel de
 * módulo y las transacciones ya no cierran la conexión. */
let promesaBaseDatos: Promise<IDBDatabase> | null = null;

/* Abre o crea la base de datos IndexedDB (una sola vez por sesión). */
export function abrirBaseDatos(): Promise<IDBDatabase> {
    promesaBaseDatos ??= new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(new Error('Error al abrir IndexedDB'));

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.datos)) {
                db.createObjectStore(STORES.datos, {keyPath: 'id'});
            }

            if (!db.objectStoreNames.contains(STORES.cola)) {
                const colaStore = db.createObjectStore(STORES.cola, {keyPath: 'id', autoIncrement: true});
                colaStore.createIndex('timestamp', 'timestamp', {unique: false});
            }

            if (!db.objectStoreNames.contains(STORES.meta)) {
                db.createObjectStore(STORES.meta, {keyPath: 'clave'});
            }
        };
    });
    return promesaBaseDatos;
}

/* Ejecuta una transacción en IndexedDB. */
export async function ejecutarTransaccion<T>(
    storeName: string,
    modo: IDBTransactionMode,
    operacion: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const db = await abrirBaseDatos();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, modo);
        const store = transaction.objectStore(storeName);
        const request = operacion(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        /* [H-F12-08] La conexión es compartida: no se cierra por transacción. */
        transaction.oncomplete = () => {};
    });
}

/* [H-F12-10] Suma 1 a `intentos` de todas las operaciones pendientes tras un
 * intento de sync fallido (la cola se reintenta entera). */
export async function incrementarIntentosDeCola(): Promise<void> {
    const db = await abrirBaseDatos();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.cola, 'readwrite');
        const store = transaction.objectStore(STORES.cola);
        const lectura = store.getAll();
        lectura.onsuccess = () => {
            const operaciones = lectura.result as OperacionCola[];
            for (const operacion of operaciones) {
                store.put({...operacion, intentos: (operacion.intentos ?? 0) + 1});
            }
        };
        lectura.onerror = () => reject(lectura.error);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

/* [H-F12-10] True si alguna operación pendiente agotó sus reintentos. */
export async function hayOperacionesAgotadas(): Promise<boolean> {
    const db = await abrirBaseDatos();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORES.cola, 'readonly');
        const store = transaction.objectStore(STORES.cola);
        const request = store.getAll() as IDBRequest<OperacionCola[]>;
        request.onsuccess = () => resolve(request.result.some(op => op.intentos >= MAX_INTENTOS));
        request.onerror = () => resolve(false);
    });
}

export async function obtenerOperacionesPendientes(): Promise<OperacionCola[]> {
    try {
        return await ejecutarTransaccion<OperacionCola[]>(STORES.cola, 'readonly', (store) =>
            store.getAll()
        );
    } catch {
        return [];
    }
}

export async function eliminarOperacion(id: number): Promise<void> {
    await ejecutarTransaccion(STORES.cola, 'readwrite', (store) => store.delete(id));
}

export async function vaciarCola(): Promise<void> {
    const operaciones = await obtenerOperacionesPendientes();
    for (const op of operaciones) {
        await eliminarOperacion(op.id);
    }
}

export async function contarOperacionesPendientes(): Promise<number> {
    try {
        const db = await abrirBaseDatos();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORES.cola, 'readonly');
            const store = transaction.objectStore(STORES.cola);
            const request = store.count();
            /* [H-F12-08] Conexión compartida: no se cierra por lectura. */
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
    } catch {
        return 0;
    }
}