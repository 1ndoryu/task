/*
 * Landing
 * Componente de landing page minimalista estilo Linear.app
 */

import '../../styles/dashboard/componentes/landing.css';

interface LandingProps {
    onLogin: () => void;
}

export function Landing({onLogin}: LandingProps): JSX.Element {
    return (
        <div id="landing-contenedor" className="landingContenedor">
            <Nav onLogin={onLogin} />
            <Hero onLogin={onLogin} />
            <Features />
            <ComoFunciona />
            <CtaFinal onLogin={onLogin} />
            <Footer />
        </div>
    );
}

/*
 * NAVEGACION
 */
function Nav({onLogin}: {onLogin: () => void}): JSX.Element {
    return (
        <nav id="landing-nav" className="landingNav">
            <span className="landingLogo">Glory</span>
            <button className="landingNavBoton" onClick={onLogin}>
                Iniciar sesion
            </button>
        </nav>
    );
}

/*
 * HERO
 */
function Hero({onLogin}: {onLogin: () => void}): JSX.Element {
    return (
        <section id="landing-hero" className="landingHero">
            <h1 className="landingHeroTitulo">Glory</h1>
            <p className="landingHeroSubtitulo">
                Dashboard de productividad personal.
                <br />
                Habitos. Tareas. Privacidad.
            </p>
            <div className="landingHeroAcciones">
                <button className="landingBotonPrimario" onClick={onLogin}>
                    Empezar gratis
                </button>
                <button className="landingBotonSecundario">Ver demo</button>
            </div>
        </section>
    );
}

/*
 * FEATURES
 */
function Features(): JSX.Element {
    const features = [
        {
            icono: '///',
            titulo: 'Habitos',
            descripcion: 'Seguimiento diario con visualizacion tipo GitHub.'
        },
        {
            icono: '[ ]',
            titulo: 'Tareas',
            descripcion: 'Proyectos jerarquicos. Subtareas. Drag & drop.'
        },
        {
            icono: '***',
            titulo: 'Privacidad',
            descripcion: 'Cifrado end-to-end. Tus datos nunca salen sin cifrar.'
        }
    ];

    return (
        <section id="landing-features" className="landingSeccion">
            <h2 className="landingSeccionTitulo">Funcionalidades</h2>
            <div className="landingFeaturesGrid">
                {features.map((feature, index) => (
                    <div key={index} className="landingFeature">
                        <div className="landingFeatureIcono">{feature.icono}</div>
                        <h3 className="landingFeatureTitulo">{feature.titulo}</h3>
                        <p className="landingFeatureDescripcion">{feature.descripcion}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/*
 * COMO FUNCIONA
 */
function ComoFunciona(): JSX.Element {
    const pasos = ['Registra tu cuenta con Google o GitHub', 'Configura tus habitos y tareas', 'Visualiza tu progreso en tiempo real'];

    return (
        <section id="landing-como-funciona" className="landingSeccion">
            <h2 className="landingSeccionTitulo">Como funciona</h2>
            <div className="landingSteps">
                {pasos.map((paso, index) => (
                    <div key={index} className="landingStep">
                        <span className="landingStepNumero">{index + 1}</span>
                        <span className="landingStepTexto">{paso}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

/*
 * CTA FINAL
 */
function CtaFinal({onLogin}: {onLogin: () => void}): JSX.Element {
    return (
        <section id="landing-cta" className="landingCta">
            <p className="landingCtaTexto">Empieza hoy. Sin tarjeta de credito.</p>
            <button className="landingBotonPrimario" onClick={onLogin}>
                Empezar gratis
            </button>
        </section>
    );
}

/*
 * FOOTER
 */
function Footer(): JSX.Element {
    return (
        <footer id="landing-footer" className="landingFooter">
            <p className="landingFooterTexto">Glory &copy; {new Date().getFullYear()}</p>
        </footer>
    );
}

export default Landing;
