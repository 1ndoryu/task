# Auditoría de Privacidad y Seguridad de Datos

**Fecha:** 9 de febrero de 2026  
**Versión:** 1.0  
**Alcance:** Sistema completo de notas, cifrado, adjuntos, compartidos y dashboard

---

## Resumen Ejecutivo

Se realizó una auditoría exhaustiva del sistema de privacidad y seguridad de datos de usuarios en Glory Dashboard. El sistema presenta una **arquitectura sólida** con aislamiento correcto de datos por usuario, cifrado AES-256-GCM robusto, y uso consistente de `$wpdb->prepare()`. Se identificaron y corrigieron vulnerabilidades de severidad media que podrían comprometer la privacidad bajo circunstancias específicas.

---

## Estado de Hallazgos y Correcciones

### CORREGIDOS

| # | Severidad | Archivo | Descripción | Estado |
|---|-----------|---------|-------------|--------|
| 1 | **ALTO** | `AdjuntosService.php` | Falta `.htaccess` para bloquear acceso directo a archivos | CORREGIDO |
| 2 | **ALTO** | `AdjuntosService.php` | Path traversal posible en `obtenerArchivo()`/`eliminarArchivo()` | CORREGIDO |
| 3 | **MEDIO** | `CifradoService.php` | Clave fallback predecible degrada silenciosamente la seguridad | CORREGIDO |
| 4 | **MEDIO** | `AdjuntosApiController.php` | Token fallback key predecible | CORREGIDO |
| 5 | **MEDIO** | `DashboardApiController.php` | Mensajes de error internos expuestos al cliente | CORREGIDO |
| 6 | **MEDIO** | `CifradoApiController.php` | Mensajes de error internos expuestos al cliente | CORREGIDO |
| 7 | **MEDIO** | `CifradoApiController.php` | Sin verificación Premium antes de toggle de cifrado | CORREGIDO |
| 8 | **MEDIO** | `AdjuntosService.php` | Cache de archivos descifrados en texto plano en disco | CORREGIDO |
| 9 | **MEDIO** | `CompartidosService.php` | Exposición innecesaria de emails completos | CORREGIDO |
| 10 | **MEDIO** | `CompartidosService.php` | Log de diagnóstico expone datos parciales de otros usuarios | CORREGIDO |
| 11 | **MEDIO** | `AuthApiController.php` | Endpoint `/auth/log` público permite spam de logs | CORREGIDO |
| 12 | **BAJO** | `AuthApiController.php` | Sin validación de complejidad de password en registro | CORREGIDO |

### VERIFICADOS (Sin Corrección Necesaria)

| # | Componente | Verificación | Resultado |
|---|------------|-------------|-----------|
| V1 | **Aislamiento de datos (SQL)** | Todas las queries filtran por `user_id = %d` | CORRECTO |
| V2 | **SQL Injection** | Uso consistente de `$wpdb->prepare()` en todo el codebase | CORRECTO |
| V3 | **Cifrado AES-256-GCM** | IV aleatorio 12 bytes, tag auth 16 bytes, HKDF por usuario | CORRECTO |
| V4 | **HMAC tokens** | Firmados SHA-256, verificación timing-safe con `hash_equals()` | CORRECTO |
| V5 | **UUIDs para archivos** | `wp_generate_uuid4()` imposible de adivinar | CORRECTO |
| V6 | **Login/recuperar** | Respuestas genéricas, no revelan si email existe | CORRECTO |
| V7 | **Limpieza de sesión** | `limpiezaSesion.ts` borra localStorage/sessionStorage al logout | CORRECTO |
| V8 | **Permisos compartidos** | Verificación de equipo antes de compartir, roles validados | CORRECTO |
| V9 | **Schema.php** | Todas las tablas tienen `user_id` indexado, UNIQUE constraint en compartidos | CORRECTO |
| V10 | **Sanitización inputs** | `sanitize_text_field`, `absint`, `wp_kses_post`, `is_email` usados | CORRECTO |

### DOCUMENTADOS (No Aplicables / Aceptados)

| # | Descripción | Justificación |
|---|-------------|---------------|
| D1 | Cifrado es at-rest servidor, no E2E real | Diseño intencional. La clave se deriva de AUTH_KEY+userId server-side. Un verdadero E2E requeriría clave del cliente. Documentado. |
| D2 | Rotación de claves no implementada | Si AUTH_KEY cambia se pierden datos cifrados. Se documenta como riesgo operacional. No aplicar cambio de AUTH_KEY en producción. |
| D3 | Datos en localStorage del frontend | Se descifran en el servidor y llegan en texto plano al cliente (necesario para renderizar). La limpieza al logout mitiga. |
| D4 | `validateData()` retorna siempre válido | La estructura JSON es flexible por diseño. Validar estrictamente rompería compatibilidad con versiones anteriores. |

---

## Detalle de Correcciones Aplicadas

### 1. Protección .htaccess para directorio de adjuntos

**Archivo:** `AdjuntosService.php`  
**Riesgo:** Archivos `.raw` accesibles directamente por URL si se conoce/adivina la ruta UUID.  
**Corrección:** Se añade `.htaccess` con `Deny from all` en todos los directorios de usuario. Solo la API puede servir archivos. Thumbnails y archivos públicos se sirven a través de la API exclusivamente.

### 2. Protección contra Path Traversal

**Archivo:** `AdjuntosService.php`  
**Riesgo:** `nombreArchivo` con `../../` podría leer/eliminar archivos fuera del directorio del usuario.  
**Corrección:** Se añade validación `validarRutaSegura()` que verifica con `realpath()` que la ruta resuelta permanece dentro del directorio del usuario. Aplicada en `obtenerArchivo()`, `eliminarArchivo()` y `obtenerInfoArchivo()`.

### 3-4. Eliminación de claves fallback predecibles

**Archivos:** `CifradoService.php`, `AdjuntosApiController.php`  
**Riesgo:** Si AUTH_KEY no está configurada, la clave se deriva de `ABSPATH` que es predecible.  
**Corrección:** Se lanza `RuntimeException` en lugar de degradar silenciosamente. Si AUTH_KEY no existe, el cifrado no debe funcionar en absoluto en lugar de dar falsa sensación de seguridad.

### 5-6. Sanitización de mensajes de error al cliente

**Archivos:** `DashboardApiController.php`, `CifradoApiController.php`  
**Riesgo:** `$e->getMessage()` puede contener rutas del servidor, nombres de tablas, datos de configuración.  
**Corrección:** Se reemplazan todos los mensajes de excepción con mensajes genéricos. Los detalles solo se registran en `error_log()`.

### 7. Verificación Premium en toggle de cifrado

**Archivo:** `CifradoApiController.php`  
**Riesgo:** Un usuario free podría activar el flag de cifrado.  
**Corrección:** Se verifica `SuscripcionService::esPremium()` antes de permitir habilitar cifrado.

### 8. Cifrado del cache en disco

**Archivo:** `AdjuntosService.php`  
**Riesgo:** Archivos descifrados se almacenan en texto plano en caché temporal.  
**Corrección:** El cache ahora también se cifra con AES-256-GCM usando la clave del usuario. Solo se descifra al servir.

### 9. Ofuscación de emails en compartidos

**Archivo:** `CompartidosService.php`  
**Riesgo:** Emails completos de usuarios expuestos innecesariamente en respuestas API.  
**Corrección:** Se ofuscan emails con formato `u***@d***.com` en todas las respuestas. Se mantiene `display_name` y avatar como identificadores suficientes.

### 10. Limpieza de logs de diagnóstico

**Archivo:** `CompartidosService.php`  
**Riesgo:** Logs de diagnóstico incluían preview de datos de otros usuarios.  
**Corrección:** Se eliminó el logging de `preview_data` y se redujo a solo conteo y IDs sin datos sensibles.

### 11. Rate limiting en endpoint de log público

**Archivo:** `AuthApiController.php`  
**Riesgo:** `/auth/log` público permite spam de logs sin límite.  
**Corrección:** Se añade throttle basado en transient de WordPress para limitar a 10 entradas por minuto por IP.

### 12. Validación de password en registro

**Archivo:** `AuthApiController.php`  
**Riesgo:** Sin requisito de complejidad mínima del password.  
**Corrección:** Se requiere mínimo 8 caracteres.

---

## Arquitectura de Seguridad Verificada

```
┌─────────────────────────────────────────────────┐
│                   CLIENTE                        │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ React App │  │ Stores   │  │ localStorage │ │
│  │ (SPA)     │  │ (Zustand)│  │ (limpieza    │ │
│  │           │  │          │  │  al logout)  │ │
│  └─────┬─────┘  └────┬─────┘  └──────────────┘ │
│        │              │                          │
│        └──────┬───────┘                          │
│               │ REST API + Nonce WP              │
└───────────────┼──────────────────────────────────┘
                │ HTTPS
┌───────────────┼──────────────────────────────────┐
│               │  SERVIDOR                        │
│  ┌────────────▼─────────────────────────┐        │
│  │  API Controllers                     │        │
│  │  • permission_callback: auth check   │        │
│  │  • sanitize_callback: sanitización   │        │
│  │  • Mensajes genéricos al cliente     │ ← FIX  │
│  └────────────┬─────────────────────────┘        │
│               │                                  │
│  ┌────────────▼─────────────────────────┐        │
│  │  Services                            │        │
│  │  • CifradoService (AES-256-GCM)      │        │
│  │  • AdjuntosService (path validation) │ ← FIX  │
│  │  • SuscripcionService (Premium gate) │ ← FIX  │
│  └────────────┬─────────────────────────┘        │
│               │                                  │
│  ┌────────────▼─────────────────────────┐        │
│  │  Repositories                        │        │
│  │  • $wpdb->prepare() siempre          │        │
│  │  • WHERE user_id = %d siempre        │        │
│  └────────────┬─────────────────────────┘        │
│               │                                  │
│  ┌────────────▼─────────────────────────┐        │
│  │  Base de Datos (MySQL)               │        │
│  │  • Datos cifrados: prefijo ENC:      │        │
│  │  • Archivos: .enc (cifrado) .raw     │        │
│  │  • .htaccess: acceso bloqueado       │ ← FIX  │
│  └──────────────────────────────────────┘        │
└──────────────────────────────────────────────────┘
```

---

## Certificación

Tras la auditoría y aplicación de las correcciones documentadas:

- **Aislamiento de datos:** Cada usuario solo puede acceder a sus propios datos. Verificado en todos los endpoints y repositorios.
- **Cifrado at-rest:** AES-256-GCM con clave derivada HKDF por usuario. Archivos y datos en BD cifrados correctamente.
- **Sin fuga de datos:** No se encontraron vectores que permitan a un usuario acceder a datos de otro usuario.
- **Protección de archivos:** Directorio de adjuntos protegido con `.htaccess`, path traversal bloqueado.
- **Limpieza de sesión:** Datos en localStorage se limpian correctamente al cerrar sesión.
- **API segura:** Endpoints protegidos por autenticación, inputs sanitizados, mensajes genéricos al cliente.

---

## TO-DO Futuro (No Críticos)

- [ ] Implementar rate limiting global con plugin o middleware (no solo en `/auth/log`)
- [ ] Considerar cifrado del cache en Redis/Memcached para mejor performance vs disco
- [ ] Implementar rotación de claves (`rotarClave()`) para mitigar compromiso de `AUTH_KEY`
- [ ] Evaluar cifrado E2E real con clave derivada del password del usuario (clave solo en cliente)
- [ ] Añadir headers de seguridad CSP para mitigar XSS en localStorage
- [ ] Considerar `HttpOnly` cookie para token MCP en lugar de localStorage
