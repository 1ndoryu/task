/*
 * Landing
 * Componente de landing page minimalista estilo Linear.app
 */

import '../../styles/dashboard/componentes/Landing/landing.css';
import {Boton} from '../ui';
import {GloryLink} from '../../../../Glory/assets/react/src/core/router/GloryLink';
import {useGloryContext} from '../../../../Glory/assets/react/src/hooks/useGloryContext';

interface LandingProps {
    onLogin: () => void;
}

export function Landing({onLogin}: LandingProps): JSX.Element {
    /* [034A-4] themeUrl dinámico desde GLORY_CONTEXT inyectado por PHP.
     * En local apunta a /wp-content/themes/glorytemplate, pero en producción
     * el tema se llama 'glory' → la URL estática hardcodeada daba 404. */
    const {themeUrl} = useGloryContext();
    const previewSvgUrl = `${themeUrl}/App/Assets/svg/Task.svg`;
    return (
        <div id="landing-contenedor" className="landingContenedor">
            {/* NAVEGACION */}
            <nav id="landing-nav" className="landingNav">
                <span className="landingLogo">Nakomi Task</span>

                <div className="landingNavMenu">
                    <a href="#producto" className="landingNavLink">
                        Producto
                    </a>
                    <a href="#recursos" className="landingNavLink">
                        Recursos
                    </a>
                    <a href="#precio" className="landingNavLink">
                        Precio
                    </a>
                    <a href="#contacto" className="landingNavLink">
                        Contacto
                    </a>
                </div>

                <Boton variante="primario" onClick={onLogin}>
                    Iniciar sesión
                </Boton>
            </nav>

            {/* HERO */}
            <section id="landing-hero" className="landingHero">
                <div className="landingHeroHeader">
                    <div className="landingHeroSubtituloLeft">
                        <p>Dashboard de productividad personal. Habitos. Tareas. Privacidad.</p>
                    </div>
                    <div className="landingHeroSubtituloRight">
                        <p>
                            Tu vida, organizada en un solo lugar.
                            <br />
                            Sin distracciones.
                        </p>
                    </div>
                </div>

                <div className="landingHeroPreview">
                    <img src={previewSvgUrl} alt="Dashboard Preview" width="1474" height="714" />
                </div>

                <div className="landingHeroGrid">
                    <div className="landingHeroGridItem">Item 1</div>
                    <div className="landingHeroGridItem">Item 2</div>
                    <div className="landingHeroGridItem">Item 3</div>
                    <div className="landingHeroGridItem">Item 4</div>
                </div>
            </section>

            {/* FOOTER */}
            <footer id="landing-footer" className="landingFooter">
                <div className="landingFooterLinks">
                    <GloryLink href="/politica-privacidad" className="landingFooterLink">
                        Política de Privacidad
                    </GloryLink>
                    <GloryLink href="/terminos-servicio" className="landingFooterLink">
                        Términos de Servicio
                    </GloryLink>
                </div>
                <p className="landingFooterTexto">Glory &copy; {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
}

export default Landing;
