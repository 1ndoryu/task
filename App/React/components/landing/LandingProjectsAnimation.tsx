export function LandingProjectsAnimation(): JSX.Element {
    return (
        <div className="landingProjectsWidget">
            <div className="landingProjectCard variant-4">
                <div className="landingProjectIcon landingProjectIcon--verde">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                </div>
                <div className="landingProjectTitle">Investigación</div>
            </div>
            <div className="landingProjectCard variant-3">
                <div className="landingProjectIcon landingProjectIcon--naranja">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                </div>
                <div className="landingProjectTitle">Marketing Q4</div>
            </div>
            <div className="landingProjectCard variant-2">
                <div className="landingProjectIcon landingProjectIcon--azul">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                </div>
                <div className="landingProjectTitle">Diseño Sistema</div>
            </div>
            <div className="landingProjectCard variant-1">
                <div className="landingProjectIcon landingProjectIcon--rojo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                </div>
                <div className="landingProjectTitle">Lanzamiento Beta</div>
            </div>
        </div>
    );
}

export default LandingProjectsAnimation;
