/* Vista de la lista: tareas y hábitos en un solo flujo, dentro de una caja
 * con scroll propio. La cabecera lleva las pestañas y el orden; las pestañas
 * parten la lista por panel, y ambos tipos de fila tienen su marca de
 * completar, su menú y su configuración.
 * Con «separar grupos en cajas» cada panel pasa a ser una caja del carril: el
 * mismo contenido, pintado al lado en vez de por turnos.
 *
 * La vista no pregunta por grupos ni por notas: recorre `lista.paneles` y elige
 * qué pinta según `panel.tipo`. Un tipo nuevo es una rama más aquí y nada más.
 * Lo que no es reparto de paneles vive fuera: las ventanas abiertas en
 * `usarVista`, y la barra, los modales y el menú de caja en sus componentes. */
import { useEffect } from 'react';
import { alternarMinimizada } from '../logica/minimizadas';
import { limpiarGrupo } from '../logica/orden';
import { PANEL_ARCHIVADOS, panelDeNota, type Panel } from '../logica/paneles';
import { ALTO_CAJA_MINIMO, ANCHO_CAJA_MINIMO } from '../logica/preferencias';
import { accionesDeLista } from './accionesDeLista';
import { AccionesBarra } from './AccionesBarra';
import { Archivados } from './Archivados';
import { BarraVentana } from './BarraVentana';
import { Carril } from './Carril';
import { ColumnasCarril } from './ColumnasCarril';
import { ContenidoPanel } from './ContenidoPanel';
import { MenuCaja } from './MenuCaja';
import { Modales } from './Modales';
import { iconoDePanel } from './Paneles';
import { Pestanas } from './Pestanas';
import { usarLista } from './usarLista';
import { usarVista } from './usarVista';

export function Lista() {
  const lista = usarLista();
  // Lo que no es dato de la lista: qué menú, modal o renombrado está abierto.
  const vista = usarVista({
    renombrarPanel: lista.renombrarPanel,
    cambiarGrupo: lista.cambiarGrupo,
    archivarNota: lista.archivarNota,
    archivarGrupo: lista.archivarGrupo,
    // El plegado se recuerda como un ajuste más; su lectura vive en `usarLista`.
    plegadasGuardadas: lista.preferencias.plegadas,
    cambiarPreferencias: lista.cambiarPreferencias,
  });

  // El tema se escribe en `<html>` y no en un contenedor: así lo heredan el
  // `body`, el `<dialog>` —que se pinta en la capa superior, fuera del árbol—
  // y las barras de scroll. `color-scheme` va con él, en la hoja.
  const tema = lista.preferencias.tema;
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  /* [por que] En la app de escritorio la ventana no lleva decoración de
   * Windows: el fondo del marco arrastra la ventana y los botones de minimizar,
   * maximizar y cerrar los pinta la página. Tauri inyecta su API global en el
   * documento que carga desde el backend del equipo; en el navegador no existe
   * y aquí no cambia nada. */
  const escritorio = Boolean((globalThis as { __TAURI__?: { window?: unknown } }).__TAURI__?.window);

  if (lista.estado.fase === 'cargando') {
    return (
      <main className={`marco${escritorio ? ' marco--escritorio' : ''}`} data-tauri-drag-region>
        <BarraVentana />
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
      <main className={`marco${escritorio ? ' marco--escritorio' : ''}`} data-tauri-drag-region>
        <BarraVentana />
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
  // Grupos de verdad para el menú de la fila y el alta: sin «Tareas», sin
  // «Completados» y sin notas, que no son grupos que una fila pueda llevar.
  const grupos = lista.grupos;
  // Cuántas filas lleva cada grupo, para decirlo antes de borrarlo.
  const cuenta: Record<string, number> = {};
  for (const nombre of [...datos.tareas.map((t) => t.grupoEjecucion), ...datos.habitos.map((h) => h.grupoEjecucion)]) {
    if (nombre) cuenta[nombre] = (cuenta[nombre] ?? 0) + 1;
  }
  // Dos formas de la misma lista: por turnos (una caja) o todas al lado.
  const enCajas = preferencias.separarGrupos;
  const { acciones, guardarCambios } = accionesDeLista(lista);

  /** Crear una nota: en cajas, el carril la centra; en pestañas, se abre. Es
   *  lo mismo desde el botón de la barra en las dos formas de la vista. */
  /** Una caja recién creada nace al tamaño mínimo (en pestañas no hay tamaño: se ignora). */
  const alMinimo = (id: string) =>
    lista.cambiarPreferencias({
      tamanos: { ...preferencias.tamanos, [id]: { ancho: ANCHO_CAJA_MINIMO, alto: ALTO_CAJA_MINIMO } },
    });
  const agregarGrupo = (nombre: string) => {
    const limpio = limpiarGrupo(nombre);
    // Solo si es de verdad nuevo: volver a «crear» uno existente no lo encoge.
    if (limpio && !lista.paneles.some((p) => p.id === limpio)) alMinimo(limpio);
    lista.crearGrupo(nombre);
  };
  const agregarNota = async () => {
    const id = await lista.crearNota();
    if (!id) return;
    alMinimo(panelDeNota(id));
    vista.setNotaNueva(id);
    if (!enCajas) lista.cambiarGrupo(id);
  };

  const accionesBarra = (
    <AccionesBarra
      enCajas={enCajas}
      orden={lista.orden}
      onOrden={lista.cambiarOrden}
      onNota={() => void agregarNota()}
      gruposAbiertos={vista.gruposAbiertos}
      onAbrirGrupos={() => vista.setGruposAbiertos(true)}
      preferencias={preferencias}
      onCambiar={lista.cambiarPreferencias}
      ajustesAbiertos={lista.ajustesAbiertos}
      onAbrirAjustes={lista.abrirAjustes}
    />
  );

  const modales = (
    <Modales
      ajustesAbiertos={lista.ajustesAbiertos}
      preferencias={preferencias}
      onCambiar={lista.cambiarPreferencias}
      onAbrirAjustes={lista.abrirAjustes}
      gruposAbiertos={vista.gruposAbiertos}
      grupos={grupos}
      cuenta={cuenta}
      onCrearGrupo={agregarGrupo}
      onRenombrarGrupo={lista.renombrarGrupo}
      onBorrarGrupo={lista.borrarGrupo}
      onCerrarGrupos={() => vista.setGruposAbiertos(false)}
      editando={lista.editando}
      proyectos={proyectos}
      colores={preferencias.colores}
      onGuardar={guardarCambios}
      onCerrarEdicion={() => lista.abrirEdicion(null)}
      borrando={vista.borrando}
      onBorrarNota={() => vista.borrando && lista.borrarNota(vista.borrando.panel.id)}
      onBorrarPanelGrupo={(conFilas) => vista.borrando && lista.borrarGrupo(vista.borrando.panel.id, conFilas)}
      onCerrarBorrado={() => vista.setBorrando(null)}
    />
  );

  /** Lo que va dentro de una caja, según su tipo. Cada panel lo pinta
   *  `ContenidoPanel`; aquí solo se le pasan los datos y los ayudantes. */
  const contenido = (panel: Panel) => (
    <ContenidoPanel
      panel={panel}
      datos={datos}
      preferencias={preferencias}
      grupos={grupos}
      acciones={acciones}
      ordenDe={lista.ordenDe}
      cambiarOrdenCaja={lista.cambiarOrdenCaja}
      crear={lista.crear}
      hoy={lista.hoy}
      saliendo={lista.saliendo}
      nota={lista.nota}
      diario={lista.diario}
      titulo={vista.titulo}
      contextoDe={vista.contextoDe}
      menuAbierto={vista.menuAbierto}
      onMenuAbierto={vista.setMenuAbierto}
      plegadas={vista.plegadas}
      onPlegar={vista.alternarPlegada}
      // Solo en el carril: es donde las cajas se ven de una en una y tienen
      // sitio para crecer. En la caja única el ancho lo manda la pantalla.
      redimensionable={enCajas}
      onTamano={(id, tamano) => {
        // Un tamaño igual al de fábrica sale de las preferencias: así la caja
        // sigue al tamaño de siempre si la ventana cambia.
        const tamanos = { ...preferencias.tamanos };
        if (tamano) tamanos[id] = tamano;
        else delete tamanos[id];
        lista.cambiarPreferencias({ tamanos });
      }}
      onMinimizar={enCajas ? (id) => lista.cambiarPreferencias({ minimizadas: alternarMinimizada(preferencias.minimizadas, id) }) : undefined}
    />
  );

  /** El panel de archivados va al final de las dos formas de la vista; apagado
   *  en Ajustes, no se monta: no hay nada que mirar ni que recuperar aquí. */
  const archivados = preferencias.mostrarArchivados ? (
    <Archivados
      grupos={lista.gruposArchivados}
      notas={lista.notasArchivadas}
      onDesarchivarGrupo={lista.desarchivarGrupo}
      onRecuperarNota={lista.recuperarNota}
    />
  ) : null;

  // Modo cajas: una por panel, en fila. Cada una se pinta con su propio grupo o
  // su propio texto, así que la que se esté mirando no depende de la activa.
  if (enCajas) {
    // El carril centra columnas, no cajas: la nota nueva es la de su columna.
    const indiceNueva = vista.notaNueva ? lista.columnas.findIndex((c) => c.includes(vista.notaNueva ?? '')) : -1;
    return (
      <main className={`marco marco--cajas${escritorio ? ' marco--escritorio' : ''}`} data-tauri-drag-region>
        <BarraVentana />
        <div className="barra barra--carril">{accionesBarra}</div>
        <Carril
          etiqueta="Paneles en cajas"
          // La nota nueva se centra sola; después manda el gesto de quien mira.
          indiceActivo={indiceNueva >= 0 ? indiceNueva : undefined}
          onMover={lista.moverPanel}
          onSoltar={(movida, apilado) => {
            lista.soltarPanel(movida, apilado);
            // La nota ya está en su sitio: no vuelve a centrarse al soltar.
            vista.setNotaNueva(null);
          }}
          /* Toda caja se arrastra, también «Tareas», «Hábitos», «Aplazado» y
             «Completados»: ser de sistema solo quita renombrar y borrar. */
          fija={(pieza) => !lista.paneles.find((p) => p.id === (pieza.dataset.panel ?? null))?.mueve}
        >
          {/* Cada panel pinta su propia `section.caja`, la pieza que se arrastra;
              el carril mide las columnas que las agrupan. */}
          <ColumnasCarril columnas={lista.columnas} paneles={lista.paneles} contenido={contenido} />
          {/* Al final del carril y sin arrastre (no lleva `data-panel`): es donde
              se recupera lo archivado, no un panel más. */}
          {archivados}
        </Carril>
        {/* El menú de la caja se pinta aquí, fuera de su `section`: es la
            pieza que el carril arrastra y nada más. */}
        <MenuCaja
          menuPanel={vista.menuPanel}
          onCerrar={() => vista.setMenuPanel(null)}
          onAccion={(panel, accion) => vista.accionPanel(panel, accion, cuenta)}
        />
        {modales}
      </main>
    );
  }

  // Archivados es una pestaña más de la lista (sin separar): no es un panel, así
  // que ocupa la caja sin tener menú, arrastre ni grupo propio.
  const verArchivados = preferencias.mostrarArchivados && lista.grupo === PANEL_ARCHIVADOS;
  const activo = lista.paneles.find((p) => p.id === lista.grupo) ?? lista.paneles[0];
  const pestanasPaneles = lista.paneles.map((panel) => ({
    id: panel.id,
    etiqueta: (
      <span className={`pestana__cuerpo pestana__cuerpo--${panel.tipo}`}>
        {iconoDePanel(panel)}
        {vista.titulo(panel, 'pestana__titulo', 'doble')}
      </span>
    ),
  }));
  if (preferencias.mostrarArchivados) {
    pestanasPaneles.push({
      id: PANEL_ARCHIVADOS,
      etiqueta: <span className="pestana__cuerpo">Archivados</span>,
    });
  }

  return (
    <main className={`marco${escritorio ? ' marco--escritorio' : ''}`} data-tauri-drag-region>
      <BarraVentana />
      <section className="marco__unica" aria-label="Tareas y hábitos">
        {/* Las acciones vuelven donde estaban: sobre la esquina derecha de la
            caja, sin ocupar altura. Los paneles cuelgan aparte, a la izquierda. */}
        <div className="barra barra--superior barra--acciones-suelta">{accionesBarra}</div>
        {/* Los paneles, al costado de la caja: una columna a la izquierda con
            su nombre recortado, y la caja centrada con ellos. */}
        <header className="barra barra--costado barra--paneles">
          <Pestanas
            titulo="Panel de la lista"
            valor={lista.grupo}
            orientacion="costado"
            opciones={pestanasPaneles}
            onElegir={lista.cambiarGrupo}
            onMover={lista.moverPestana}
            esFija={(id) => !lista.paneles.find((p) => p.id === id)?.mueve}
            panelDe={(id) => lista.paneles.find((p) => p.id === id)}
            onAccion={(id, accion) => {
              const panel = lista.paneles.find((p) => p.id === id);
              if (panel) vista.accionPanel(panel, accion, cuenta);
            }}
            claseDe={(id) => {
              const tipo = lista.paneles.find((p) => p.id === id)?.tipo;
              return tipo ? `pestana--${tipo}` : undefined;
            }}
          />
        </header>
        {verArchivados ? (
          <Archivados
            grupos={lista.gruposArchivados}
            notas={lista.notasArchivadas}
            onDesarchivarGrupo={lista.desarchivarGrupo}
            onRecuperarNota={lista.recuperarNota}
          />
        ) : (
          contenido(activo)
        )}
        {/* El menú de la caja única: en las pestañas va dentro de su lista; en
            la caja, aquí, porque su `section` no es envoltorio del menú. */}
        <MenuCaja
          menuPanel={vista.menuPanel}
          onCerrar={() => vista.setMenuPanel(null)}
          onAccion={(panel, accion) => vista.accionPanel(panel, accion, cuenta)}
        />
      </section>
      {modales}
    </main>
  );
}
