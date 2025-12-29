export function LandingHabitAnimation(): JSX.Element {
    return (
        <div className="landingHabitWidget">
            <div className="landingHabitRow">
                <div className="landingHabitCheck" />
                <span className="landingHabitLabel">Leer 20 páginas de filosofía</span>
            </div>
            <div className="landingHabitRow" style={{opacity: 0.6}}>
                <div className="landingHabitCheck" style={{animation: 'none', borderColor: '#444'}} />
                <span className="landingHabitLabel">Meditación matutina (15 min)</span>
            </div>
            <div className="landingHabitRow" style={{opacity: 0.4}}>
                <div className="landingHabitCheck" style={{animation: 'none', borderColor: '#444'}} />
                <span className="landingHabitLabel">Revisar métricas semanales</span>
            </div>
        </div>
    );
}

export default LandingHabitAnimation;
