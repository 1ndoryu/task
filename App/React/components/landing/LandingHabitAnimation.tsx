export function LandingHabitAnimation(): JSX.Element {
    return (
        <div className="landingHabitWidget">
            <div className="landingHabitRow">
                <div className="landingHabitCheck" />
                <span className="landingHabitLabel">Leer 20 páginas de filosofía</span>
            </div>
            <div className="landingHabitRow landingHabitRow--pendiente">
                <div className="landingHabitCheck landingHabitCheck--inactivo" />
                <span className="landingHabitLabel">Meditación matutina (15 min)</span>
            </div>
            <div className="landingHabitRow landingHabitRow--lejano">
                <div className="landingHabitCheck landingHabitCheck--inactivo" />
                <span className="landingHabitLabel">Revisar métricas semanales</span>
            </div>
        </div>
    );
}

export default LandingHabitAnimation;
