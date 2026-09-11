/* [039A-1/FASE-FINAL] Raíz única para portales React.
 * Los menús flotantes y modales deben escapar de ancestros con transform u
 * overflow:hidden (panel arrastrable, contenedores de vistas), que confinan o
 * recortan cualquier overlay position:fixed interno — por eso se montan con
 * createPortal en document.body. Centralizar aquí el acceso mantiene todo el
 * DOM directo dentro del boundary de plataforma (app/utils) en vez de
 * repartido por los plugins. */
export function obtenerRaizPortales(): HTMLElement {
    return document.body;
}
