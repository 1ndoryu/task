/*
 * plugins/agente/ModalTareasProgramadas.tsx
 * [318A-7J1] Modal de tareas programadas del agente: lista + formulario de
 * creación. Usa el sistema declarativo (Modal, Input, Select, Textarea, Boton)
 * y la TarjetaTareaProgramada compartida; el estado del formulario vive aquí
 * (no en usePanelAgente) para mantener PanelAgente bajo limite-lineas y sin
 * html-nativo. El caller solo aporta datos, acciones y la promesa onCrear.
 */

import {type ChangeEvent, type FormEvent, useState} from 'react';
import {Loader2, Plus} from 'lucide-react';
import {Boton, Input, Select, Textarea} from '../../components/ui';
import {Modal} from '../../components/shared/Modal';
import {TarjetaTareaProgramada} from './componentes';
import type {TareaProgramada} from './service';

interface DatosNuevaTarea {
    nombre: string;
    prompt: string;
    tipo: 'una_vez' | 'recurrente';
    cron_expr?: string;
    ejecutar_en?: string;
}

interface PropsModalTareasProgramadas {
    estaAbierto: boolean;
    onCerrar: () => void;
    tareas: TareaProgramada[];
    cargando: boolean;
    error: string | null;
    onEliminar: (id: string) => Promise<void>;
    onCrear: (datos: DatosNuevaTarea) => Promise<void>;
}

export function ModalTareasProgramadas({
    estaAbierto,
    onCerrar,
    tareas,
    cargando,
    error,
    onEliminar,
    onCrear,
}: PropsModalTareasProgramadas): JSX.Element {
    const [formulario, setFormulario] = useState({
        nombre: '',
        prompt: '',
        tipo: 'una_vez' as 'una_vez' | 'recurrente',
        cron: '',
        ejecutarEn: '',
    });
    const [tareaGuardando, setTareaGuardando] = useState(false);

    const actualizarCampo = (campo: keyof typeof formulario) => (
        evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        setFormulario(prev => ({...prev, [campo]: evento.target.value}));
    };

    const manejarCrear = (evento: FormEvent) => {
        evento.preventDefault();
        const nombre = formulario.nombre.trim();
        const prompt = formulario.prompt.trim();
        if (!nombre || !prompt || tareaGuardando) return;
        setTareaGuardando(true);
        void onCrear({
            nombre,
            prompt,
            tipo: formulario.tipo,
            ...(formulario.tipo === 'recurrente'
                ? {cron_expr: formulario.cron.trim() || undefined}
                : formulario.ejecutarEn
                    ? {ejecutar_en: new Date(formulario.ejecutarEn).toISOString()}
                    : {}),
        }).finally(() => {
            setTareaGuardando(false);
            setFormulario({
                nombre: '',
                prompt: '',
                tipo: 'una_vez',
                cron: '',
                ejecutarEn: '',
            });
        });
    };

    return (
        <Modal
            estaAbierto={estaAbierto}
            onCerrar={onCerrar}
            titulo={`Tareas programadas (${tareas.length})`}
        >
            <div className="panelAgenteTareasContenido">
                {error && <div className="panelIAError">{error}</div>}
                {cargando && (
                    <div className="panelAgenteTareasVacio">
                        <Loader2 size={12} className="animacionGirar" /> Cargando...
                    </div>
                )}
                {!cargando && tareas.length === 0 && !error && (
                    <div className="panelAgenteTareasVacio">Sin tareas programadas todavía.</div>
                )}
                {tareas.map(tarea => (
                    <TarjetaTareaProgramada
                        key={tarea.id}
                        tarea={tarea}
                        onEliminar={id => void onEliminar(id)}
                    />
                ))}
                <form className="panelAgenteTareaForm" onSubmit={manejarCrear}>
                    <Input
                        claseAdicional="panelAgenteTareaInput"
                        placeholder="Nombre"
                        value={formulario.nombre}
                        maxLength={255}
                        required
                        onChange={actualizarCampo('nombre')}
                    />
                    <Textarea
                        claseAdicional="panelAgenteTareaInput panelAgenteTareaPrompt"
                        placeholder="Instrucciones para el agente"
                        value={formulario.prompt}
                        maxLength={4000}
                        required
                        filas={2}
                        onChange={actualizarCampo('prompt')}
                    />
                    <Select
                        claseAdicional="panelAgenteTareaInput"
                        value={formulario.tipo}
                        opciones={[
                            {valor: 'una_vez', etiqueta: 'Una vez'},
                            {valor: 'recurrente', etiqueta: 'Recurrente'},
                        ]}
                        onChange={actualizarCampo('tipo')}
                    />
                    {formulario.tipo === 'recurrente' ? (
                        <Input
                            claseAdicional="panelAgenteTareaInput"
                            placeholder="diario | cada30min | cada2h | cada3d"
                            value={formulario.cron}
                            required
                            onChange={actualizarCampo('cron')}
                        />
                    ) : (
                        <Input
                            claseAdicional="panelAgenteTareaInput"
                            tipo="datetime-local"
                            value={formulario.ejecutarEn}
                            onChange={actualizarCampo('ejecutarEn')}
                        />
                    )}
                    <Boton type="submit" variante="primario" tamano="pequeño" disabled={tareaGuardando}>
                        {tareaGuardando ? <Loader2 size={11} className="animacionGirar" /> : <Plus size={11} />}
                        Programar
                    </Boton>
                </form>
            </div>
        </Modal>
    );
}
