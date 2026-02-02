---
description: Gestionar sitios WordPress en Coolify (crear, reiniciar, desplegar tema, etc.)
---

# Workflow: Coolify Manager

Herramienta para gestionar sitios WordPress en el VPS con Coolify.

## Ubicacion

Los scripts estan en: `.agent/coolify-manager/`

## Comandos Principales

### Ver ayuda
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 help
```

### Listar sitios y su estado
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 list
```

### Crear nuevo sitio
```powershell
.\.agent\coolify-manager\manager.ps1 new -SiteName "NOMBRE" -Domain "https://DOMINIO.com"
```
Parametros opcionales:
- `-GloryBranch "rama"` - Rama del tema Glory
- `-LibraryBranch "rama"` - Rama de la libreria
- `-SkipTheme` - No instalar tema

### Reiniciar sitio
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 restart -SiteName "NOMBRE"
```
O reiniciar todos:
```powershell
.\.agent\coolify-manager\manager.ps1 restart -All
```

### Desplegar/Actualizar tema Glory
Instalacion completa:
```powershell
.\.agent\coolify-manager\manager.ps1 deploy -SiteName "NOMBRE" -GloryBranch "rama"
```
Actualizacion rapida (git pull):
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 deploy -SiteName "NOMBRE" -Update
```

### Importar base de datos
```powershell
.\.agent\coolify-manager\manager.ps1 import -SiteName "NOMBRE" -SqlFile "ruta/al/archivo.sql" -FixUrls
```

### Ejecutar comando en contenedor
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 exec -SiteName "NOMBRE" -Command "ls -la"
```
Codigo PHP:
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 exec -SiteName "NOMBRE" -PhpCode "echo get_option('siteurl');"
```

### Ver logs
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 logs -SiteName "NOMBRE" -Lines 50
```

### Estado del sistema
```powershell
// turbo
.\.agent\coolify-manager\manager.ps1 status
```

## Archivos de Configuracion

- **settings.json**: `.agent\coolify-manager\config\settings.json`
  - Contiene credenciales del VPS, API de Coolify y lista de sitios

## Sitios Actuales Registrados

Ver en settings.json o ejecutar `.\manager.ps1 list`

## Notas

- SSH debe estar configurado con clave publica (sin password)
- Los comandos marcados con `// turbo` son seguros para auto-ejecutar
