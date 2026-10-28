/* Acciones de la barra: orden, nota nueva, grupos, privacidad, tema y ajustes.
 * Es una pieza sola porque la barra se pinta igual en las dos formas de la
 * vista, arriba del carril o suelta sobre la caja; solo cambia si el orden
 * general está o no, que en cajas baja a cada caja. */
import type { ReactNode } from 'react';
import type { Panel } from '../logica/paneles';
import { MODOS_ORDEN, type ModoOrden } from '../logica/orden';
import type { Preferencias } from '../logica/preferencias';
import type { Vidrio } from './ConfigVidrio';
import { ExploradorCajas } from './ExploradorCajas';
import { IconoAjustes, IconoCarpeta, IconoNota, IconoOrden, IconoPrivacidad, IconoTema } from './Iconos';
import { BotonPerfil } from './BotonPerfil';
import { Menu } from './Menu';
import { IconoFecha, IconoOrdenInteligente, IconoOrdenManual, IconoPrioridad } from './MenuOpciones';

/** Un icono por modo de orden: a qué criterio obedece la lista. */
const ICONO_ORDEN: Record<ModoOrden, ReactNode> = {
  inteligente: <IconoOrdenInteligente />,
  manual: <IconoOrdenManual />,
  fecha: <IconoFecha />,
  prioridad: <IconoPrioridad />,
};

interface Props {
  /** Modo cajas: el orden general no se ofrece, cada caja ordena lo suyo. */
  enCajas: boolean;
  orden: ModoOrden;
  onOrden: (modo: ModoOrden) => void;
  onNota: () => void;
  gruposAbiertos: boolean;
  onAbrirGrupos: () => void;
  preferencias: Preferencias;
  onCambiar: (cambios: Partial<Preferencias>) => void;
  ajustesAbiertos: boolean;
  onAbrirAjustes: (abiertos: boolean) => void;
  /** Todas las cajas, también las apagadas, para el explorador. */
  todosPaneles: Panel[];
  /** Cristal compartido con la barra: el explorador lo usa igual. */
  vidrio: Vidrio;
}

export function AccionesBarra({
  enCajas,
  orden,
  onOrden,
  onNota,
  gruposAbiertos,
  onAbrirGrupos,
  preferencias,
  onCambiar,
  ajustesAbiertos,
  onAbrirAjustes,
  todosPaneles,
  vidrio,
}: Props) {
  const { tema, privacidad } = preferencias;
  return (
    <div className="barra__acciones">
      {!enCajas && (
        <Menu
          etiqueta={<IconoOrden tam={13} />}
          titulo={`Ordenar la lista: ${MODOS_ORDEN.find((m) => m.id === orden)?.etiqueta ?? ''}`}
          items={MODOS_ORDEN.map((modo) => ({
            id: modo.id,
            etiqueta: modo.etiqueta,
            activo: orden === modo.id,
            icono: ICONO_ORDEN[modo.id],
          }))}
          onElegir={(id) => onOrden(id as ModoOrden)}
          claseBoton="barra__boton barra__icono"
        />
      )}
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-label="Crear una nota"
        title="Nueva nota"
        onClick={onNota}
      >
        <IconoNota tam={13} />
      </button>
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={gruposAbiertos}
        aria-label="Gestionar los grupos"
        title="Grupos"
        onClick={onAbrirGrupos}
      >
        <IconoCarpeta tam={13} />
      </button>
      <ExploradorCajas todos={todosPaneles} preferencias={preferencias} onCambiar={onCambiar} vidrio={vidrio} />
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-pressed={privacidad}
        aria-label={privacidad ? 'Quitar el modo privacidad' : 'Activar el modo privacidad'}
        title={privacidad ? 'Privacidad: activa' : 'Modo privacidad'}
        onClick={() => onCambiar({ privacidad: !privacidad })}
      >
        <IconoPrivacidad tam={13} oculto={privacidad} />
      </button>
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-pressed={tema === 'oscuro'}
        aria-label={tema === 'oscuro' ? 'Encender la vista clara' : 'Apagar la luz: modo oscuro'}
        title={tema === 'oscuro' ? 'Vista clara' : 'Modo oscuro'}
        onClick={() => onCambiar({ tema: tema === 'oscuro' ? 'claro' : 'oscuro' })}
      >
        <IconoTema tam={13} oscuro={tema === 'oscuro'} />
      </button>
      <button
        type="button"
        className="barra__boton barra__icono"
        aria-haspopup="dialog"
        aria-expanded={ajustesAbiertos}
        aria-label="Abrir los ajustes"
        title="Ajustes"
        onClick={() => onAbrirAjustes(true)}
      >
        <IconoAjustes tam={13} />
      </button>
      <BotonPerfil />
    </div>
  );
}

/** El botón de orden de una caja del carril: cada una ordena lo suyo y el
 *  resto no se mueve. En la caja única no hay elección: manda el general. */
export function MenuOrdenCaja({
  panel,
  orden,
  onElegir,
}: {
  panel: Panel;
  orden: ModoOrden;
  onElegir: (modo: ModoOrden) => void;
}) {
  return (
    <Menu
      etiqueta={<IconoOrden tam={13} />}
      titulo={`Ordenar «${panel.etiqueta}»: ${MODOS_ORDEN.find((m) => m.id === orden)?.etiqueta ?? ''}`}
      items={MODOS_ORDEN.map((opcion) => ({
        id: opcion.id,
        etiqueta: opcion.etiqueta,
        activo: orden === opcion.id,
        icono: ICONO_ORDEN[opcion.id],
      }))}
      onElegir={(id) => onElegir(id as ModoOrden)}
      claseBoton="barra__boton barra__icono"
    />
  );
}
