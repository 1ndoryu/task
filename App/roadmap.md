# GloryTemplate  Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify)  stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs)  sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic

## Herramientas del agente
- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

1. [COMPLETADA 253A-2] Tracked se queda activo al completar habito

2. HABIA COMENTADO QUITAR EL EFECTO HOVER DE COLOR BACKGROUND CUANDO SE PONE EL MOUSE SOBRE 
<button type="button" class="boton boton--ghost boton--mediano panelAyunoBotonCircular panelAyunoBotonCircular--terminar" data-tooltip-content="Terminar ayuno"><span class="botonTexto"></span></button>

3. LOS CUADROS DE LOS DIAS SIGUEN DESBORDANDONSEEEEEE EN Historial de cumplimiento y en ACTIVIDAD; YA ES LA CUARTA VEZ QUE LO DIGO! Tambien hay efectos de background hover en deficitComidaAcciones que no deberian de estar

4. mal calculo de la ia de calorías, puse  Media arepa, huevo y 2 tajadas de platano y dice 500 calorías pero en realidad esa comida tiene en promedio 300 calorías. Revisar esto y hacer los calculos mas inteligentes 

5. [COMPLETADA 253A-1] Los subhabitos — edición nombre, prioridad hereda padre, filtro fantasmas

6. Permitir más altura maxima para el panel de nota. 
 
7. Permitir tener varios paneles de notas, se agrega un submenu el boton de + en la nota para permitir crear en una nueva ventana o en la misma. 

8. Nuevo plugin: gestor de grupos, esto es algo complicado, he creado una extensión que analiza grupos de facebook, esta extension tambien tiene varios problemas a resolver, 

8.1 el primero es que acabo de un tiempo deja de funcionar

8.2 la extension (fb-group-manager) se tiene que conectar a task, de alguna forma tal vez con api key o algo, de la mejor manera, lo que hara es que se controlara la lista grupos en un panel dedicado en el proyecto task, sera una tabla como la tabla de habitos, tendra un check para marcar que se publico en se grupo, menu contextuales para ocultar ese grupo, tiene que poder cambiar de entorno, boton para ir el grupo, cambiar categoría, prioridad, analizar con ia para quitar los relevantes, etc, tiene que sincronizarse en tiempo real, si es necesario ajustar la extension ok, pero lo importante es que detecte siempre nuevos grupos, que se puedan organizar por entorno por ia.

8.3 la extension no muestra bien el tooltip para modificar los grupos dentro de la pagina de facebook, necesito que en en la pagina de facebook muestre un tooltip con las acciones para poder marcar acciones como modifcar, marcar como publicado ocultar, los grupos ocultados tienen que tener tener un icono de ocultado cuando aparecen el feed ocuando se abren directamente.

8.4 No estoy segura de esto pero la extension parece ocultar comentarios de facebook 

9. Lo de posponer tareas funciona falta primero porque es incruente, veo posponer hoy y posponer mañana, no se cual es la diferencia y que sentido tiene tener 2 opciones asi, y tampoco hay para elegir cuanto tiempo cuando se quiere especificar. 

9.1 Por cierto tampoco en las fechas de las tareas se puede especificar una fecha, debería con un calendario con el estilo del sitio.

10. En el modal de creacion rapida se puede elegir la fecha pero no se puede quitar una vez que se elige una. Y tambien debería poder selecionarse una fecha.

11. El icono de IA sigue sin ser un icono de IA cuando se minimiza el panel de chat con IA. No me refería a ponerlo sobre seccionTitulo, de hecho hay que quitarlo de ahi. 

12. Cuando hago hover en <button type="submit" class="boton boton--primario boton--mediano creacionRapidaBotonEnviar"><span class="botonIcono"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></span></button> el fondo se pone blanco y como el icono es blanco tambien se pierde. 

13. ya lo habia comentando antes, hay un hover backround en <button type="button" class="boton boton--ghost boton--mediano panelAyunoBotonCircular panelAyunoBotonCircular--terminar" data-tooltip-content="Terminar ayuno"><span class="botonTexto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg></span></button> que no debería!!

14. Puse 4 puños de arroz y salio 1100 calorías en vez 300-400g, mejorar tambien este sistema para que entienda sobre promedios y que los valores que se piden por dia lo reflejen tambien, no suelo usar cantidades exactas, sino medir por puños, 