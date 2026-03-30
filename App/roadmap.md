# GloryTemplate Roadmap

> **Descripcion:** Dashboard personal con tareas, habitos, proyectos, notas, actividad y mas. Tema WordPress con React islands.
> **Stack:** WordPress + PHP (backend REST), React + TypeScript (frontend islands), Zustand (estado), CSS modular
> **URL produccion:** https://task.nakomi.studio
> **Servidor:** nakomi (Coolify) stack UUID: u00gc8ss4csc4cckkg4g00ks
> **Deploy:** Coolify (.agent/coolify-manager-rs) sitio: nakomi
> **Repositorio:** glorytemplate: rama glory-react-logic

## Herramientas del agente

- Code Sentinel: `.agent/code-sentinel`
- VarSense: `.agent/varsense`
- Coolify Manager: `.agent/coolify-manager-rs`

## Tareas pendientes

12. Nunca aparecen los grupos de facebook en el panel, a de entender que ya tenia grupos guardados, ya recargue la extension, puse la api que genere en la extension, le di a sincronizar, y sigue sin aparecern ningun grupo. Tal vez tenga que ver este error que veo

Executing inline event handler violates the following Content Security Policy directive 'script-src 'self''. Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required to enable inline execution. Note that hashes do not apply to event handlers, style attributes and javascript: navigations unless the 'unsafe-hashes' keyword is present. The action has been blocked.
Contexto
dashboard/dashboard.html
Seguimiento de la pila
dashboard/dashboard.html:1 (función anónima)
1
muestra una lista de numeros de 1 a 493 que omiti por brevedad.
493
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FB Group Manager — Dashboard</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>

13. Cuando desactivo el plugin de grupos, no se quita del panel hasta que lo minimizo, debe quitarse.

14. Actualiza el changelog del proyecto con todas las tareas completadas de App\Agente\completados, como son muchas cosas puedes dividir las versiones. haz que el modal de Historial de Versiones tenga carga difererida, carga por scroll. No se porque modalContenido agrega 20px padding ahi pero quitalo especificamente de ese modal, y agrega padding: 20px; en contenedorVersiones 

16. La estension de grupo deja de funcionar despues de cerrar y abrir la pestaña de facebook.
