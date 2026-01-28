# Plan de Refactorización Progresiva (SOLID)

## Misión
Refactorizar el código heredado y masivo hacia una arquitectura limpia, modular y adherente a los principios SOLID. El objetivo no es solo separar lógica de presentación, sino reestructurar archivos monolíticos en componentes pequeños, reutilizables y con una única responsabilidad.

## Estrategia
La refactorización será **progresiva y atómica**. No se detendrá el desarrollo de nuevas features. Cada refactor debe:
1.  **Ser seguro**: No romper funcionalidad existente. Probar manualmente cada cambio.
2.  **Ser atómico**: Enfocarse en un archivo o módulo a la vez.
3.  **Seguir la regla del boy scout**: Dejar el código mejor de lo que se encontró.

## Reglas de Oro (Refactorización)

1.  **Límite de Líneas**:
    *   Componentes/Vistas: Máximo **300 líneas**.
    *   Hooks/Lógica: Máximo **150 líneas**.
    *   *Acción*: Si un archivo excede esto, **DEBE** ser analizado para división.

2.  **Principio de Responsabilidad Única (SRP)**:
    *   *Componentes*: Solo UI y renderizado.
    *   *Hooks*: Solo lógica de estado, efectos y llamadas a servicios.
    *   *Servicios/Utils*: Solo lógica de negocio pura y transformación de datos.
    *   *Stores*: Solo gestión global del estado (evitar lógica de negocio compleja dentro del store).

3.  **Separación de Conceptos**:
    *   **NO** mezclar llamadas `fetch` directas en componentes. Usar hooks o servicios.
    *   **NO** escribir estilos inline o constantes mágicas grandes dentro del JSX.

4.  **Organización de Archivos**:
    *   Hooks complejos (>50 líneas) o reutilizables van a `hooks/dominio/` o `hooks/shared/`.
    *   Componentes extraídos van a subcarpetas específicas `components/dominio/feature/`.

5.  **Tipado Estricto (TypeScript)**:
    *   Reducir el uso de `any` a 0.
    *   Definir interfaces claras en `types/` y compartirlas.

## Problemas Críticos Detectados

1.  **Exceso de Props (Prop Drilling) vs Estado Global**:
    *   **Diagnóstico**: Se observa un paso excesivo de propiedades a través de múltiples niveles de componentes, ensuciando el código y dificultando el mantenimiento.
    *   **Solución**: Identificar datos compartidos y moverlos al **Global State (Zustand)**.
    *   *Regla*: Si una prop pasa por más de 2 niveles sin usarse, muévela al Store.

2.  **Inconsistencia en Componentización**:
    *   **Diagnóstico**: Bloques de JSX repetitivos o complejos existen dentro de componentes padres en lugar de ser extraídos.
    *   **Solución**: Todo lo que sea una unidad visual o lógica distinguible (Botones, Tarjetas, Listas, Badges) debe ser un componente independiente (`shared` o específico).
    *   *Regla*: No escribas bloques de renderizado largos (`renderItem`, `renderHeader`) dentro del componente principal; extráelos como componentes.

## Flujo de Trabajo

1.  **Identificar**: Revisar `TOP-20-ARCHIVOS.md` y seleccionar el archivo más pesado (mayor número de líneas) de la categoría correspondiente (React/TSX).
2.  **Analizar**: Detectar lógica acoplada, props excesivas y UI no atomizada.
3.  **Refactorizar**: Aplicar principios SOLID.
    *   Extraer componentes pequeños.
    *   Mover lógica a hooks o stores.
4.  **Actualizar Métricas**: Al finalizar una refactorización importante, ejecutar el script para regenerar `TOP-20-ARCHIVOS.md` y verificar la reducción de tamaño.

## Notas Adicionales
- Este documento es un **organismo vivo**.
- No empezar un refactor si no se tiene tiempo para terminarlo y probarlo.
- Preferir pequeños commits frecuentes.
