/* Vista de la lista: tareas y hábitos en un solo flujo, dentro de una caja
 * con scroll propio. La cabecera lleva las pestañas y el orden; las pestañas
 * parten la lista por grupo de ejecución, y ambos tipos de fila tienen su
 * marca de completar, su menú y su configuración. */
import { useState } from 'react';
import { MODOS_ORDEN, PESTANA_COMPLETADOS, type ModoOrden } from '../logica/orden';
import { Ajustes } from './Ajustes';
import { ConfiguracionTarea } from './ConfiguracionTarea';
import type { CambiosFilaForm } from './opcionesFila';
import { Fila } from './Fila';
import { grupoDe, type AccionesFila } from './accionesFila';
import { IconoAjustes, IconoOrden, IconoPrivacidad } from './Iconos';
import { Menu } from './Menu';
import { Pestanas } from './Pestanas';
import { claveFila, usarLista, type Editando } from './usarLista';

export function Lista() {
  const lista = usarLista();
  // Menú abierto con clic derecho, con la clave de la fila y el punto pulsado.
  // Se guarda aquí porque el clic derecho nace fuera del propio menú.
  const [menuAbierto, setMenuAbierto] = useState<{ clave: string; x: number; y: number } | null>(null);

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

  const filas = lista.vista?.filas ?? [];
  const completados = lista.vista?.completados ?? false;
  const proyectos = lista.estado.datos.proyectos;
  const { preferencias } = lista;
  // Grupos de verdad para el menú de la fila: sin «Tareas» ni «Completados»,
  // que no son grupos que una fila pueda llevar.
  const grupos = lista.pestanas.map((p) => p.id).filter((id) => id && id !== PESTANA_COMPLETADOS);
  // Los ajustes entran como modificadores de la caja: el CSS decide, la vista solo
  // declara qué está activo.
  const clases = [
    'caja',
    preferencias.privacidad && 'caja--privacidad',
    `caja--fuente-${preferencias.fuente}`,
    `caja--altura-${preferencias.altura}`,
    !preferencias.separador && 'caja--sin-separador',
    preferencias.privacidadAlcance === 'todas' && 'caja--privacidad-todas',
  ]
    .filter(Boolean)
    .join(' ');

  const acciones: AccionesFila = {
    completar: lista.completar,
    editar: lista.abrirEdicion,
    borrar: (fila) => (fila.tipo === 'tarea' ? lista.borrarTarea(fila.tarea.id) : lista.borrarHabito(fila.habito.id)),
    prioridad: (fila, prioridad) => {
      const cambios: CambiosFilaForm = {
        texto: fila.tipo === 'tarea' ? fila.tarea.texto : fila.habito.nombre,
        prioridad: prioridad ?? 'media',
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

  return (
    <main className="marco">
      <section className={clases} aria-label="Tareas y hábitos">
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
          <div className="barra__acciones">
            <Menu
              etiqueta={<IconoOrden />}
              titulo={`Ordenar la lista: ${MODOS_ORDEN.find((m) => m.id === lista.orden)?.etiqueta ?? ''}`}
              items={MODOS_ORDEN.map((modo) => ({
                id: modo.id,
                etiqueta: modo.etiqueta,
                activo: lista.orden === modo.id,
              }))}
              onElegir={(id) => lista.cambiarOrden(id as ModoOrden)}
              claseBoton="barra__boton barra__icono"
            />
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
        </header>

        <div className="scroll">
          {filas.length === 0 ? (
            <p className="aviso">{completados ? 'Nada completado.' : 'Nada pendiente.'}</p>
          ) : (
            <ul className={`lista${completados ? ' lista--completados' : ''}`}>
              {filas.map((fila) => {
                const valor: NonNullable<Editando> =
                  fila.tipo === 'tarea' ? { tipo: 'tarea', tarea: fila.tarea } : { tipo: 'habito', habito: fila.habito };
                return (
                  <Fila
                    key={claveFila(valor)}
                    fila={valor}
                    saliendo={lista.saliendo.has(claveFila(valor))}
                    acciones={acciones}
                    grupos={grupos}
                    completados={completados}
                    hoy={lista.hoy}
                    menuAbierto={menuAbierto?.clave === claveFila(valor) ? menuAbierto : null}
                    onMenuAbierto={(punto) => setMenuAbierto(punto ? { clave: claveFila(valor), ...punto } : null)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <Ajustes
        abierto={lista.ajustesAbiertos}
        preferencias={preferencias}
        onCambiar={lista.cambiarPreferencias}
        onCerrar={() => lista.abrirAjustes(false)}
      />

      <ConfiguracionTarea
        fila={lista.editando}
        proyectos={proyectos}
        grupos={grupos}
        onGuardar={guardarCambios}
        onCerrar={() => lista.abrirEdicion(null)}
      />
    </main>
  );
}
