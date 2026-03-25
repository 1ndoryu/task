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

2. [COMPLETADA 253A-3] Hover background en boton terminar ayuno

3. [COMPLETADA 253A-3] Cuadros dias desbordando + hover en deficitComidaAcciones

4. [COMPLETADA 253A-8] mal calculo de la ia de calorías, puse  Media arepa, huevo y 2 tajadas de platano y dice 500 calorías pero en realidad esa comida tiene en promedio 300 calorías. Revisar esto y hacer los calculos mas inteligentes 

5. [COMPLETADA 253A-1] Los subhabitos — edición nombre, prioridad hereda padre, filtro fantasmas

6. [COMPLETADA 253A-4] Permitir más altura maxima para el panel de nota. 
 
7. Permitir tener varios paneles de notas, se agrega un submenu el boton de + en la nota para permitir crear en una nueva ventana o en la misma. 

8. Nuevo plugin: gestor de grupos, esto es algo complicado, he creado una extensión que analiza grupos de facebook, esta extension tambien tiene varios problemas a resolver, 

8.1 el primero es que acabo de un tiempo deja de funcionar

8.2 la extension (fb-group-manager) se tiene que conectar a task, de alguna forma tal vez con api key o algo, de la mejor manera, lo que hara es que se controlara la lista grupos en un panel dedicado en el proyecto task, sera una tabla como la tabla de habitos, tendra un check para marcar que se publico en se grupo, menu contextuales para ocultar ese grupo, tiene que poder cambiar de entorno, boton para ir el grupo, cambiar categoría, prioridad, analizar con ia para quitar los relevantes, etc, tiene que sincronizarse en tiempo real, si es necesario ajustar la extension ok, pero lo importante es que detecte siempre nuevos grupos, que se puedan organizar por entorno por ia.

8.3 la extension no muestra bien el tooltip para modificar los grupos dentro de la pagina de facebook, necesito que en en la pagina de facebook muestre un tooltip con las acciones para poder marcar acciones como modifcar, marcar como publicado ocultar, los grupos ocultados tienen que tener tener un icono de ocultado cuando aparecen el feed ocuando se abren directamente.

8.4 No estoy segura de esto pero la extension parece ocultar comentarios de facebook 

9. [COMPLETADA 253A-7] Lo de posponer tareas funciona falta primero porque es incruente, veo posponer hoy y posponer mañana, no se cual es la diferencia y que sentido tiene tener 2 opciones asi, y tampoco hay para elegir cuanto tiempo cuando se quiere especificar. 

9.1 Por cierto tampoco en las fechas de las tareas se puede especificar una fecha, debería con un calendario con el estilo del sitio.

10. [COMPLETADA 253A-6] En el modal de creacion rapida se puede elegir la fecha pero no se puede quitar una vez que se elige una. Y tambien debería poder selecionarse una fecha.

11. [COMPLETADA 253A-5] El icono de IA sigue sin ser un icono de IA cuando se minimiza el panel de chat con IA. No me refería a ponerlo sobre seccionTitulo, de hecho hay que quitarlo de ahi. 

12. [COMPLETADA 253A-3] Hover blanco en boton enviar creacion rapida

13. [COMPLETADA 253A-3] Hover background en boton terminar ayuno (duplicado de 2)

14. [COMPLETADA 253A-8] Puse 4 puños de arroz y salio 1100 calorías en vez 300-400g, mejorar tambien este sistema para que entienda sobre promedios y que los valores que se piden por dia lo reflejen tambien, no suelo usar cantidades exactas, sino medir por puños, 