/* Vista de la lista: tareas y hábitos en un solo flujo, dentro de una caja
 * con scroll propio. La cabecera lleva las pestañas y el orden; las pestañas
 * parten la lista por grupo de ejecución, y ambos tipos de fila tienen su
 * marca de completar, su menú y su configuración.
 * Con «separar grupos en cajas» cada pestaña pasa a ser una caja del carril: el
 * mismo grupo, pintado al lado en vez de por turnos. */
import { useState, type ReactNode } from 'react';
import { importanciaDeHabito } from '../logica/importancia';
import { MODOS_ORDEN, PESTANA_COMPLETADOS, type ModoOrden } from '../logica/orden';
import { seleccionar } from '../logica/seleccion';
import { Ajustes } from './Ajustes';
import { Caja } from './Caja';
import { Carril } from './Carril';
import { ConfiguracionTarea } from './ConfiguracionTarea';
import type { CambiosFilaForm } from './opcionesFila';
import { grupoDe, type AccionesFila } from './accionesFila';
import { IconoAjustes, IconoCarpeta, IconoOrden, IconoPrivacidad } from './Iconos';
import { Menu } from './Menu';
import { PanelGrupos } from './PanelGrupos';
import { IconoFecha, IconoOrdenInteligente, IconoOrdenManual, IconoPrioridad } from './MenuOpciones';
import { NuevaFila } from './NuevaFila';
import { Pestanas } from './Pestanas';
import { usarLista, type Editando } from './usarLista';

/** Un icono por modo de orden: a qué criterio obedece la lista. */
const ICONO_ORDEN: Record<ModoOrden, ReactNode> = {
  inteligente: <IconoOrdenInteligente />,
  manual: <IconoOrdenManual />,
  fecha: <IconoFecha />,
  prioridad: <IconoPrioridad />,
};

export function Lista() {
  const lista = usarLista();
  // Menú abierto con clic derecho, con la clave de la fila y el punto pulsado.
  // Se guarda aquí porque el clic derecho nace fuera del propio menú.
  const [menuAbierto, setMenuAbierto] = useState<{ clave: string; x: number; y: number } | null>(null);
  // Panel de grupos: alta, renombrado y borrado de los nombres de grupo.
  const [gruposAbiertos, setGruposAbiertos] = useState(false);

  if (lista.estado.fase === 'cargando') {
    return (
      <main className="marco">
        <div className="caja">
          {/* Centrado en la caja entera y con su pulso: es la única cosa viva
              mientras llega la lista. */}
          <p className="cargando" role="status">
            <span className="cargando__punto" />
            Cargando…
          </p>
        </div>
      </main>
    );
  }

  if (lista.estado.fase === 'error') {
    return (
      <main className="marco">
        <div className="caja">
          <p className="aviso aviso--error" role="alert">
            {lista.estado.mensaje}
          </p>
        </div>
      </main>
    );
  }

  const datos = lista.estado.datos;
  const proyectos = datos.proyectos;
  const { preferencias } = lista;
  // Grupos de verdad para el menú de la fila: sin «Tareas» ni «Completados»,
  // que no son grupos que una fila pueda llevar.
  const grupos = lista.pestanas.map((p) => p.id).filter((id) => id && id !== PESTANA_COMPLETADOS);
  // Cuántas filas lleva cada grupo, para decirlo antes de borrarlo.
  const cuenta: Record<string, number> = {};
  for (const nombre of [...datos.tareas.map((t) => t.grupoEjecucion), ...datos.habitos.map((h) => h.grupoEjecucion)]) {
    if (nombre) cuenta[nombre] = (cuenta[nombre] ?? 0) + 1;
  }
  // Dos formas de la misma lista: por turnos (una caja) o todas al lado.
  const enCajas = preferencias.separarGrupos;

  const acciones: AccionesFila = {
    completar: lista.completar,
    editar: lista.abrirEdicion,
    borrar: (fila) => (fila.tipo === 'tarea' ? lista.borrarTarea(fila.tarea.id) : lista.borrarHabito(fila.habito.id)),
    prioridad: (fila, prioridad) => {
      // El menú elige en ids; el hábito los guarda como texto (`Muy Alta`).
      const nivel = prioridad ?? 'media';
      const cambios: CambiosFilaForm = {
        texto: fila.tipo === 'tarea' ? fila.tarea.texto : fila.habito.nombre,
        prioridad: fila.tipo === 'tarea' ? nivel : importanciaDeHabito(nivel),
        urgencia: fila.tipo === 'tarea' ? (fila.tarea.urgencia ?? 'normal') : 'normal',
        proyectoId: fila.tipo === 'tarea' ? (fila.tarea.proyectoId ?? null) : null,
        fechaMaxima: fila.tipo === 'tarea' ? (fila.tarea.configuracion?.fechaMaxima ?? '') : '',
        grupoEjecucion: grupoDe(fila) ?? '',
      };
      guardarCambios(fila, cambios);
    },
    mover: lista.moverGrupo,
  };

  /** Guarda el modal en el tipo que corresponda. */
  function guardarCambios(fila: NonNullable<Editando>, cambios: CambiosFilaForm): void {
    const grupo = cambios.grupoEjecucion.trim() || null;
    if (fila.tipo === 'tarea') {
      lista.editarTarea(fila.tarea.id, {
        texto: cambios.texto,
        prioridad: cambios.prioridad,
        urgencia: cambios.urgencia,
        proyectoId: cambios.proyectoId,
        fechaMaxima: cambios.fechaMaxima,
        grupoEjecucion: grupo,
      });
    } else {
      lista.editarHabito(fila.habito.id, {
        texto: cambios.texto,
        prioridad: cambios.prioridad,
        grupoEjecucion: grupo,
        frecuencia: cambios.frecuencia,
      });
    }
  }

  /** Las acciones de la cabecera: orden, privacidad y ajustes. Las pintan la
   * cabecera de la caja única y, en modo cajas, la barra del carril. */
  const accionesBarra = (
    <div className="barra__acciones">
      <Menu
        etiqueta={<IconoOrden />}
        titulo={`Ordenar la lista: ${MODOS_ORDEN.find((m) => m.id === lista.orden)?.etiqueta ?? ''}`}
        items={MODOS_ORDEN.map((modo) => ({
          id: modo.id,
          etiqueta: modo.etiqueta,
          activo: lista.orden === modo.id,
          icono: ICONO_ORDEN[modo.id],
        }))}
        onElegir={(id) => lista.cambiarOrden(id as ModoOrden)}
        claseBoton="barra__boton barra__icono"
      />
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={gruposAbiertos}
        aria-label="Gestionar los grupos"
        title="Grupos"
        onClick={() => setGruposAbiertos(true)}
      >
        <IconoCarpeta />
      </button>
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-pressed={preferencias.privacidad}
        aria-label={preferencias.privacidad ? 'Quitar el modo privacidad' : 'Activar el modo privacidad'}
        title={preferencias.privacidad ? 'Privacidad: activa' : 'Modo privacidad'}
        onClick={() => lista.cambiarPreferencias({ privacidad: !preferencias.privacidad })}
      >
        <IconoPrivacidad oculto={preferencias.privacidad} />
      </button>
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={lista.ajustesAbiertos}
        aria-label="Abrir los ajustes"
        title="Ajustes"
        onClick={() => lista.abrirAjustes(true)}
      >
        <IconoAjustes />
      </button>
    </div>
  );

  const modales = (
    <>
      <Ajustes
        abierto={lista.ajustesAbiertos}
        preferencias={preferencias}
        onCambiar={lista.cambiarPreferencias}
        onCerrar={() => lista.abrirAjustes(false)}
      />

      <PanelGrupos
        abierto={gruposAbiertos}
        grupos={grupos}
        cuenta={cuenta}
        onCrear={lista.crearGrupo}
        onRenombrar={lista.renombrarGrupo}
        onBorrar={lista.borrarGrupo}
        onCerrar={() => setGruposAbiertos(false)}
      />

      <ConfiguracionTarea
        fila={lista.editando}
        proyectos={proyectos}
        grupos={grupos}
        colores={preferencias.colores}
        onGuardar={guardarCambios}
        onCerrar={() => lista.abrirEdicion(null)}
      />
    </>
  );

  // Modo cajas: una por pestaña, en fila. Cada una se pinta con su propio
  // grupo, así que la que se esté mirando no depende de la pestaña activa.
  if (enCajas) {
    return (
      <main className="marco marco--cajas">
        <div className="barra barra--carril">{accionesBarra}</div>
        <Carril total={lista.pestanas.length}>
          {lista.pestanas.map((pestana) => {
            const completados = pestana.id === PESTANA_COMPLETADOS;
            const vista = seleccionar(datos, {
              orden: lista.orden,
              grupo: pestana.id === '' ? null : pestana.id,
              ocultarHabitos: preferencias.ocultarHabitos,
              hoy: lista.hoy,
              saliendo: lista.saliendo,
            });
            return (
              <Caja
                key={pestana.id}
                etiqueta={pestana.etiqueta}
                preferencias={preferencias}
                cabecera={
                  <header className="barra">
                    <p className="barra__titulo">{pestana.etiqueta}</p>
                  </header>
                }
                alta={
                  <NuevaFila
                    grupo={completados ? null : pestana.id || null}
                    grupos={grupos}
                    colores={preferencias.colores}
                    onCrear={lista.crear}
                    oculto={completados}
                  />
                }
                filas={vista.filas}
                saliendo={lista.saliendo}
                completados={vista.completados}
                acciones={acciones}
                grupos={grupos}
                colores={preferencias.colores}
                hoy={lista.hoy}
                menuAbierto={menuAbierto}
                onMenuAbierto={setMenuAbierto}
              />
            );
          })}
        </Carril>
        {modales}
      </main>
    );
  }

  const filas = lista.vista?.filas ?? [];
  const completados = lista.vista?.completados ?? false;

  return (
    <main className="marco">
      <Caja
        etiqueta="Tareas y hábitos"
        preferencias={preferencias}
        cabecera={
          <header className="barra">
            <Pestanas
              titulo="Pestaña de la lista"
              valor={lista.grupo}
              opciones={lista.pestanas}
              onElegir={lista.cambiarGrupo}
              onMover={lista.moverPestana}
              esFija={(id) => id === '' || id === PESTANA_COMPLETADOS}
              clase="barra__pestanas"
            />
            {accionesBarra}
          </header>
        }
        // Alta rápida: desaparece en «Completados», que es solo lectura.
        alta={
          <NuevaFila
            grupo={lista.grupo || null}
            grupos={grupos}
            colores={preferencias.colores}
            onCrear={lista.crear}
            oculto={completados}
          />
        }
        filas={filas}
        saliendo={lista.saliendo}
        completados={completados}
        acciones={acciones}
        grupos={grupos}
        colores={preferencias.colores}
        hoy={lista.hoy}
        menuAbierto={menuAbierto}
        onMenuAbierto={setMenuAbierto}
      />
      {modales}
    </main>
  );
}
