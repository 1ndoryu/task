# Instrucciones de Despliegue - Corrección Autoload

## Problema Resuelto
Error en producción: `PHP Fatal error: Trait "App\Repository\CifradoTrait" not found`

## Causa
El namespace `App\` no estaba configurado en el autoloader PSR-4 de Composer, causando problemas de orden de carga de dependencias (traits, clases base, etc.).

## Cambios Realizados

### 1. composer.json
Se agregó el namespace `App\` al autoload PSR-4:
```json
"autoload": {
    "psr-4": {
        "Glory\\": "Glory/src/",
        "App\\": "App/"
    }
}
```

### 2. functions.php
Se modificó la carga de archivos para:
- **Cargar manualmente**: `App/Config/`, `App/Content/`, `App/Templates/`, `App/Api/`
  - Estos contienen hooks, rutas REST y código de inicialización
- **Autoload PSR-4**: `App/Repository/`, `App/Services/`, `App/Database/`, `App/Helpers/`
  - Solo clases que se instancian bajo demanda

## Pasos para Desplegar en Producción

### 1. Hacer Pull de los Cambios
```bash
cd /var/www/html/wp-content/themes/glory
git pull origin glory-react-logic
```

### 2. Regenerar Autoloader de Composer
**CRÍTICO**: Debe ejecutarse para que Composer reconozca el nuevo namespace
```bash
composer dump-autoload --optimize
```

### 3. Verificar Permisos
```bash
# Asegurar que el servidor web puede leer vendor/
chmod -R 755 vendor/
chown -R www-data:www-data vendor/
```

### 4. Limpiar Cachés de WordPress
```bash
# Si usas WP-CLI
wp cache flush

# O desde el admin panel de WordPress
# WP Admin → Plugins → Limpiar cachés (si hay plugin de caché)
```

### 5. Verificar que Funciona
- Cargar el sitio y verificar que no hay errores 500
- Abrir el dashboard y verificar que las rutas REST responden (sin 404)
- Revisar logs de PHP: `/var/log/php-fpm/error.log` o similar

## Verificación de Éxito

### Antes (Error)
```
PHP Fatal error: Trait "App\Repository\CifradoTrait" not found
GET /wp-json/glory/v1/dashboard → 404
```

### Después (Correcto)
```
✓ No hay errores de traits no encontrados
✓ GET /wp-json/glory/v1/dashboard → 200
✓ Todas las rutas REST funcionan
```

## Rollback (si algo falla)

Si después del despliegue hay problemas:

1. Revertir commits:
```bash
git revert HEAD~2..HEAD
composer dump-autoload --optimize
```

2. O volver a la versión anterior:
```bash
git reset --hard HEAD~2
composer dump-autoload --optimize
```

## Archivos Modificados
- `composer.json` - Agregado autoload PSR-4 para `App\`
- `functions.php` - Ajustada carga de directorios

## Notas Técnicas

### ¿Por qué App/Api/ sigue cargándose manualmente?
Los controladores de API ejecutan código al cargarse (`::register()` al final de cada archivo) para registrar rutas REST. El autoload PSR-4 solo carga clases cuando se instancian, no ejecuta código automáticamente.

### ¿Qué pasa con Repository y Services?
Ahora se cargan via PSR-4, lo que:
- Elimina problemas de orden de dependencias
- Mejora el rendimiento (carga bajo demanda)
- Sigue el estándar PSR-4

### ¿Y si añado nuevas clases?
- **Clases en `App/Repository/`, `App/Services/`, `App/Database/`**: Se cargan automáticamente vía PSR-4
- **Controladores en `App/Api/`**: Se cargan automáticamente (incluirArchivos() los escanea)
- **Hooks/Config en `App/Config/`**: Se cargan automáticamente
