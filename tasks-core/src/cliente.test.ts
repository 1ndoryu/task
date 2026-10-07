/*
 * tasks-core/src/cliente.test.ts
 * El cliente mapea cada estado HTTP a su `ErrorKanban` y falla rápido sin red.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearClienteKanban} from './cliente.ts';
import type {ErrorKanban, FetchFn, PeticionHttp, RespuestaHttp} from './tipos.ts';

interface Llamada {
    url: string;
    init: PeticionHttp;
}

function doble(respuesta: Partial<RespuestaHttp> & {cuerpo?: unknown}, llamadas: Llamada[], lanza?: Error): FetchFn {
    return async (url, init) => {
        if (lanza !== undefined) {
            throw lanza;
        }
        llamadas.push({url, init});
        return {
            ok: respuesta.ok ?? true,
            estado: respuesta.estado ?? 200,
            cabeceras: respuesta.cabeceras ?? {obtener: () => null},
            json: async () => respuesta.cuerpo ?? null,
        };
    };
}

const versionado = (id: number): unknown => ({id, item: {texto: `t${id}`}, updatedAt: '2026-10-07T00:00:00.000Z'});

async function codigoDe(promesa: Promise<unknown>): Promise<ErrorKanban> {
    try {
        await promesa;
        assert.fail('debía rechazar');
    } catch (error) {
        return error as ErrorKanban;
    }
}

test('lista tareas del proyecto por su ruta F1', async () => {
    const llamadas: Llamada[] = [];
    const cliente = crearClienteKanban({base: 'http://127.0.0.1:4199', fetchFn: doble({cuerpo: {tareas: [versionado(1)]}}, llamadas)});
    const tareas = await cliente.listarTareasProyecto(9001);
    assert.equal(tareas.length, 1);
    assert.equal(llamadas[0].url, 'http://127.0.0.1:4199/api/projects/9001/tasks');
    assert.equal(llamadas[0].init.method, 'GET');
});

test('envía el CSRF cuando el editor lo aporta', async () => {
    const llamadas: Llamada[] = [];
    const cliente = crearClienteKanban({fetchFn: doble({cuerpo: {actualizadas: []}}, llamadas), leerCsrf: () => 'abc'});
    await cliente.reordenarBulk({movimientos: [{legacyId: 1, orden: 0}]});
    assert.equal(llamadas[0].init.headers?.['x-csrf-token'], 'abc');
    assert.equal(llamadas[0].url, '/api/tasks/reordenar');
});

test('mapea 404/422/409/429 a su código con el mensaje del servidor', async () => {
    const casos: Array<[number, string, Record<string, string | null>, keyof ErrorKanban & string]> = [
        [404, 'Proyecto no encontrado', {}, 'codigo'],
        [422, 'lote malo', {}, 'codigo'],
        [409, 'duplicadas', {}, 'codigo'],
        [429, 'cuota', {'retry-after': '2'}, 'codigo'],
    ];
    for (const [estado, mensaje, cabeceras, _campo] of casos) {
        const llamadas: Llamada[] = [];
        const cliente = crearClienteKanban({
            fetchFn: doble({ok: false, estado, cuerpo: {message: mensaje}, cabeceras: {obtener: (n) => cabeceras[n] ?? null}}, llamadas),
        });
        const error = await codigoDe(cliente.reordenarBulk({movimientos: [{legacyId: 1, orden: 0}]}));
        assert.equal(error.mensaje, mensaje);
        assert.equal(error.estadoHttp, estado);
    }
    const llamadas: Llamada[] = [];
    const cliente429 = crearClienteKanban({
        fetchFn: doble({ok: false, estado: 429, cuerpo: {}, cabeceras: {obtener: () => '2'}}, llamadas),
    });
    const cuota = await codigoDe(cliente429.reordenarBulk({movimientos: [{legacyId: 1, orden: 0}]}));
    assert.equal(cuota.codigo, 'cuota');
    assert.equal(cuota.reintentarEnMs, 2000);
});

test('falla rápido sin red ante legacyId inválido o lote fuera de tope', async () => {
    const llamadas: Llamada[] = [];
    const cliente = crearClienteKanban({fetchFn: doble({}, llamadas)});
    const porId = await codigoDe(cliente.listarTareasProyecto(0));
    assert.equal(porId.codigo, 'validacion');
    const porLote = await codigoDe(cliente.reordenarBulk({movimientos: []}));
    assert.equal(porLote.codigo, 'validacion');
    assert.equal(llamadas.length, 0);
});

test('caída del fetch es error de red y forma inesperada es error de servidor', async () => {
    const llamadas: Llamada[] = [];
    const clienteRed = crearClienteKanban({fetchFn: doble({}, llamadas, new Error('caído'))});
    assert.equal((await codigoDe(clienteRed.listarTareasProyecto(1))).codigo, 'red');
    const llamadas2: Llamada[] = [];
    const clienteRaro = crearClienteKanban({fetchFn: doble({cuerpo: {tareas: 'raro'}}, llamadas2)});
    assert.equal((await codigoDe(clienteRaro.listarTareasProyecto(1))).codigo, 'servidor');
});
