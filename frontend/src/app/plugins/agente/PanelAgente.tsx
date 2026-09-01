/*
 * plugins/agente/PanelAgente.tsx
 * Panel del agente de IA (plan-agente-ia-plugin, Fase 4): tabs de
 * conversaciones (persistidas en el servidor), streaming SSE con tarjetas
 * de tool y contexto visible. Reutiliza el sistema de diseño (SeccionEncabezado,
 * Boton, Textarea) y las clases de panelIA.css para coherencia visual.
 * Los bloques visuales (mensajes, tools, tabs, tareas, estados) viven en
 * componentes.tsx. Toda la lógica de estado vive en usePanelAgente.ts para
 * mantener el componente bajo el límite de línea y sin usestate-excesivo.
 */

import {ArrowUp, Bot, Clock, Plus, Settings} from 'lucide-react';
import {SeccionEncabezado} from '../../components/dashboard';
import {Boton, Textarea} from '../../components/ui';
import {ModalConfigAgente} from './ModalConfigAgente';
import {ModalTareasProgramadas} from './ModalTareasProgramadas';
import {usePanelAgente} from './usePanelAgente';
import {useAgenteStore} from './store';
import {
    BarraContextoInferior,
    BotonCancelar,
    ControlesInputIA,
    EstadoCarga,
    EstadoVacio,
    MensajeAsistente,
    MensajeUsuario,
    MODELOS_AGENTE,
    TabsWorkspace,
} from './componentes';
import type {PanelBaseProps} from '../../types/paneles';

import '../../styles/dashboard/componentes/panelIA.css';
import './panelAgente.css';

export function PanelAgente({renderHandleArrastre, handleMinimizar}: PanelBaseProps): JSX.Element {
    const {
        tabs,
        tabActivaId,
        tabActiva,
        cargandoLista,
        errorLista,
        tareasProgramadas,
        cargandoTareas,
        errorTareas,
        refScroll,
        inputTexto,
        setInputTexto,
        editandoTitulo,
        setEditandoTitulo,
        tituloEdicion,
        setTituloEdicion,
        configAbierta,
        setConfigAbierta,
        tareasAbiertas,
        setTareasAbiertas,
        compactando,
        abrirTab,
        crearTab,
        cerrarTab,
        limpiarErrorTab,
        reintentarMensaje,
        crearTarea,
        eliminarTarea,
        cancelarTurno,
        rebobinarTab,
        manejarEnviar,
        manejarTecla,
        iniciarRenombrado,
        confirmarRenombrado,
        manejarCompactar,
    } = usePanelAgente();

    /* [318A-4] Config global del agente (modelo/modo) para los selectores del
     * input. Mismo patrón que ModalConfigAgente: `establecerConfig` persiste en
     * localStorage + config de la conversación activa. */
    const configAgente = useAgenteStore(s => s.config);
    const establecerConfig = useAgenteStore(s => s.establecerConfig);

    return (
        <div className="internaColumna panelIA panelAgente">
            <SeccionEncabezado
                icono={null}
                titulo={renderHandleArrastre('IA')}
                subtitulo={tabActiva?.enviando ? 'trabajando...' : undefined}
                variante="panelHeader"
                acciones={
                    <>
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => void crearTab()}
                            icono={<Plus size={12} />}
                            title="Nueva conversación"
                        />
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => setTareasAbiertas(true)}
                            icono={<Clock size={12} />}
                            title="Tareas programadas"
                        />
                        <Boton
                            variante="badge"
                            soloIcono
                            onClick={() => setConfigAbierta(true)}
                            icono={<Settings size={12} />}
                            title="Configurar agente"
                        />
                        {handleMinimizar}
                    </>
                }
            />
            <ModalConfigAgente activo={configAbierta} onCerrar={() => setConfigAbierta(false)} />

            {/* Tabs de conversaciones */}
            <TabsWorkspace
                tabs={tabs.map(t => ({id: t.conversacion.id, titulo: t.conversacion.titulo}))}
                activaId={tabActivaId}
                editandoId={editandoTitulo}
                tituloEdicion={tituloEdicion}
                onActivar={id => void abrirTab(id)}
                onIniciarRenombrado={iniciarRenombrado}
                onCambiarTituloEdicion={setTituloEdicion}
                onConfirmarRenombrado={confirmarRenombrado}
                onCancelarRenombrado={() => setEditandoTitulo(null)}
                onCerrar={id => void cerrarTab(id)}
            />

            {/* Área de mensajes */}
            <div ref={refScroll} className="panelIAMensajes">
                {cargandoLista && <EstadoCarga texto="Cargando conversaciones..." />}

                {errorLista && (
                    <div className="panelIAError">{errorLista}</div>
                )}

                {!cargandoLista && tabs.length === 0 && !errorLista && (
                    <EstadoVacio icono={<Bot size={32} />} texto="Nueva conversación: pide al agente crear tareas, hábitos, notas o recordatorios.">
                        <Boton variante="primario" tamano="pequeño" onClick={() => void crearTab()}>
                            <Plus size={12} /> Nueva conversación
                        </Boton>
                    </EstadoVacio>
                )}

                {tabActiva?.cargandoHistorial && <EstadoCarga texto="Cargando historial..." />}

                {tabActiva?.error && (
                    <div className="panelIAError">
                        {tabActiva.error}
                        <Boton
                            variante="ghost"
                            tamano="pequeño"
                            onClick={() => limpiarErrorTab(tabActiva.conversacion.id)}
                        >
                            Descartar
                        </Boton>
                    </div>
                )}

                {tabActiva && !tabActiva.cargandoHistorial && tabActiva.mensajes.length === 0 && (
                    <EstadoVacio icono={<Bot size={32} />} texto="Escribe un mensaje para comenzar. Doble clic en una tab para renombrarla." />
                )}

                {tabActiva?.mensajes.map(mensaje => {
                    /* [318A-5] Rebobinar hasta este mensaje (volver atrás o
                     * editar): el contexto vuelve a ese punto. `idBd` es el id
                     * real en BD (los mensajes locales usan `db-<id>`); los
                     * mensajes nuevos sin idBd (no persistidos) no pueden
                     * rebobinar el servidor. Volver conserva el mensaje
                     * objetivo; editar lo elimina para reescribirlo. */
                    const idBd = /^db-(\d+)$/.exec(mensaje.id)?.[1];
                    const rebobinarAqui = (editar: boolean) => {
                        if (idBd && !tabActiva.enviando) {
                            void rebobinarTab(tabActiva.conversacion.id, Number(idBd), mensaje.id, editar);
                        }
                    };
                    if (mensaje.rol === 'user') {
                        return (
                            <MensajeUsuario
                                key={mensaje.id}
                                contenido={mensaje.contenido}
                                onVolver={() => rebobinarAqui(false)}
                                onEditar={() => rebobinarAqui(true)}
                            />
                        );
                    }
                    const ultimo = mensaje.id === tabActiva.mensajes[tabActiva.mensajes.length - 1]?.id;
                    return (
                        <MensajeAsistente
                            key={mensaje.id}
                            contenido={mensaje.contenido}
                            herramientas={mensaje.herramientas}
                            contexto={mensaje.contexto}
                            aprobacionPendiente={mensaje.aprobacionPendiente}
                            reintentar={mensaje.reintentar}
                            enviando={tabActiva.enviando}
                            ultimo={ultimo}
                            onReintentar={() => void reintentarMensaje()}
                        />
                    );
                })}
            </div>

            {/* Tareas programadas (modal reutilizable del design system) */}
            <ModalTareasProgramadas
                estaAbierto={tareasAbiertas}
                onCerrar={() => setTareasAbiertas(false)}
                tareas={tareasProgramadas}
                cargando={cargandoTareas}
                error={errorTareas}
                onEliminar={eliminarTarea}
                onCrear={crearTarea}
            />

            {/* [318A-5] Barra de uso de contexto inferior: uso del último turno
             * con tooltip (usado, máximo, %, salida, skills). La maxVentana
             * viene de la config de la tab (o la global). [318A-7] Con el
             * desglose por secciones + botón Compactar (cuando el runtime
             * emitió contexto_detalle). */}
            <BarraContextoInferior
                contexto={tabActiva ? [...tabActiva.mensajes].reverse().find(m => m.contexto)?.contexto ?? null : null}
                maxVentana={tabActiva?.config.maxVentana ?? configAgente.maxVentana}
                onCompactar={tabActiva ? manejarCompactar : undefined}
                compactando={compactando}
            />

            {/* Input */}
            <div className="panelIAInput panelIAInput--agente">
                <div className="panelIAInputCaja">
                    <Textarea
                        claseAdicional="panelIAInputTexto"
                        claseContenedor="panelIAInputContenedor"
                        value={inputTexto}
                        onChange={e => setInputTexto(e.target.value)}
                        onKeyDown={manejarTecla}
                        placeholder={tabActiva ? 'Escribe un mensaje...' : 'Crea o abre una conversación'}
                        disabled={!tabActiva || tabActiva.enviando}
                        filas={1}
                        autoAjustar
                    />
                    {tabActiva?.enviando ? (
                        <BotonCancelar onCancelar={cancelarTurno} />
                    ) : (
                        <Boton
                            type="button"
                            variante="icono"
                            tamano="pequeño"
                            soloIcono
                            claseAdicional="panelIAInputEnviar"
                            onClick={() => manejarEnviar(inputTexto)}
                            disabled={!tabActiva || !inputTexto.trim()}
                            icono={<ArrowUp size={16} />}
                            title="Enviar"
                        />
                    )}
                    {/* [318A-4] Selector de modelo + modo DENTRO de la misma
                     * caja del input. Cuando no hay tab activa o está
                     * enviando, se deshabilitan. */}
                    <ControlesInputIA
                        modelo={configAgente.modelo}
                        modo={configAgente.modo}
                        deshabilitado={!tabActiva || tabActiva.enviando}
                        onCambiarModelo={modelo => {
                            /* [02-09-2026] Al elegir modelo también se fija su
                             * proveedor (del catálogo) para que el backend enrute
                             * directo (p.ej. laguna-s-2.1-free → commandcode). */
                            const entrada = MODELOS_AGENTE.find(m => m.id === modelo);
                            establecerConfig({
                                modelo,
                                provider: entrada?.proveedor ?? configAgente.provider,
                            });
                        }}
                        onCambiarModo={modo => establecerConfig({modo})}
                    />
                </div>
            </div>
        </div>
    );
}