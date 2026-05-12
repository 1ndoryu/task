# GloryTemplate Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify) stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs) sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic
> **Espejo:** https://github.com/1ndoryu/task (rama main = glory-react-logic). Push: `git push task`. Submodulos: Glory, .agent/code-sentinel, .agent/varsense, .agent/coolify-manager-rs, .agent/coolify-manager.

## Herramientas del agente

- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

### 115A-7 — Roadmap: integración chatbot con ayuno y calorías
- Planificar acciones del agente para el plugin de ayuno: `iniciar_ayuno`, `terminar_ayuno`, `estado_ayuno` (lo que espero es que sea capaz registrar el ayuno con el tiempo correcto, aqui el tiempo y hora exacta es muy importante, claramente tiene que marse el habito de ayuno cuando se complete un ayuno)
- Planificar acciones para registro de calorías: `registrar_comida {descripcion, calorias?}`, `resumen_calorias_hoy` (lo que espero es que pueda decirle una comida y que no vaya a fallar por ello, que pueda decirme cuantas calorías llevo, que adapte a la meta de calorías diaras objetivo basado en la configuracion del plugin)
- Revisar APIs existentes del plugin de ayuno y del módulo de calorías antes de implementar

### 125A-11 — Auditoría profunda y mejora estratégica del agente
- necesito una revision detallada y profunda del agente, una auditoría de seguridad, optimización, revision, etc, profunda, necesito ver en que se puede mejorar el agente, investiga sobre los modelos que sueñan para organizar informacion y como podemos emular, lo de los recordatorio por ejemplo falla, a veces no recuerda ni avisa, lo hace en tiempo incorrecto, se le dice cierto tiempo y sigue atorado en la anterior tiempo. 
- planifica la gestión de miniagentes (que usen el modelo mas inteligente de grop), para pulir los pasos intermedios si es que es necesario
- Reducción de las intrucciones, revisar si las instrucciones son eficiente y ordenadas para el modelo y como se puede mejorar la eficiencia. 
- Actualmente la api del modelo usa grop y tiene opcion para la api de deepseek, revisa si podemos usar opencode directamente (que es gratis con el modelo deepseek sin remplazar totalmente la integración), esto sería genial porque deepseek flash v4 (nivel de pensamiento max) es un mejor modelo que gpt oss 120B
- Revisar que haya salto de modelos, si un modelo no responde salta al proximo mas cercano en inteligencia en el chatbot. 