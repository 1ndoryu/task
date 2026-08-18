/*
 * usePanelDeficitCalorico
 * Hook que gestiona la lógica del panel de déficit calórico.
 * Incluye: estado de UI (enfoque, inspección), fecha activa,
 * cálculo de macros y derivaciones del hook useDeficitCalorico.
 */

import {useState, useMemo, useCallback} from 'react';
import {useDeficitCalorico} from '../useDeficitCalorico';

/* Obtiene la fecha de hoy en formato ISO local (YYYY-MM-DD) */
function obtenerFechaHoyLocal(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/* Desplaza una fecha ISO por N días */
function desplazarFecha(fechaIso: string, dias: number): string {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    const fecha = new Date(anio, (mes ?? 1) - 1, dia ?? 1);
    fecha.setDate(fecha.getDate() + dias);
    const nuevoAnio = fecha.getFullYear();
    const nuevoMes = String(fecha.getMonth() + 1).padStart(2, '0');
    const nuevoDia = String(fecha.getDate()).padStart(2, '0');
    return `${nuevoAnio}-${nuevoMes}-${nuevoDia}`;
}

export function usePanelDeficitCalorico() {
    const [modoEnfoque, setModoEnfoque] = useState(false);
    const [logInspeccion, setLogInspeccion] = useState<string[] | null>(null);
    const [fechaActiva, setFechaActiva] = useState(obtenerFechaHoyLocal);

    const {comidasDelDia, caloriasDelDia, comidasTotales, tdee, apiKey, cargandoIA, errorIA, registrarPorTexto, eliminarComida, datosUsuario} = useDeficitCalorico(fechaActiva);

    /* Calcular totales de macros */
    const macros = useMemo(() => {
        return comidasDelDia.reduce(
            (acc, c) => ({
                proteinas: acc.proteinas + (c.proteinas || 0),
                carbohidratos: acc.carbohidratos + (c.carbohidratos || 0),
                grasas: acc.grasas + (c.grasas || 0),
                azucar: acc.azucar + (c.azucar || 0)
            }),
            {proteinas: 0, carbohidratos: 0, grasas: 0, azucar: 0}
        );
    }, [comidasDelDia]);

    const sinApiKey = !apiKey;

    const manejarCambiarDia = useCallback((delta: number) => {
        setFechaActiva(prev => desplazarFecha(prev, delta));
    }, []);

    return {
        /* Estado UI */
        modoEnfoque, setModoEnfoque,
        logInspeccion, setLogInspeccion,
        fechaActiva,
        /* Datos de déficit calórico */
        comidasDelDia, caloriasDelDia, comidasTotales,
        tdee, cargandoIA, errorIA,
        registrarPorTexto, eliminarComida, datosUsuario,
        /* Derivados */
        macros, sinApiKey,
        /* Handlers */
        manejarCambiarDia
    };
}
