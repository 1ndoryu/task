/*
 * DashboardFooter
 * Pie de página del dashboard
 * Responsabilidad única: mostrar información de copyright
 */

import {APP_TEXTS} from '../../constants/appTexts';

export function DashboardFooter(): JSX.Element {
    const anioActual = new Date().getFullYear();
    const {producto, empresa, derechos} = APP_TEXTS.footer;

    return (
        <footer id="dashboard-footer" className="dashboardFooter">
            <p>
                {producto} es un producto de {empresa}. © {anioActual} {derechos}.
            </p>
        </footer>
    );
}
