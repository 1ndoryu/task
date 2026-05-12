<?php
/**
 * [125B-1] CLI runner para WhatsAppEventWorker.
 *
 * Uso:
 *   php scripts/whatsapp-worker-runner.php
 *   php scripts/whatsapp-worker-runner.php --wp-path=/ruta/a/wp-load.php
 *
 * Ejecuta un ciclo del worker de cola WhatsApp.
 * Diseñado para ser llamado por systemd timer cada 5s.
 *
 * systemd timer:
 *   [Unit]
 *   Description=WhatsApp event worker for %i
 *
 *   [Timer]
 *   OnCalendar=*-*-* *:*:00/5
 *   Persistent=true
 *
 *   [Install]
 *   WantedBy=timers.target
 *
 * systemd service que ejecuta este script:
 *   [Service]
 *   Type=oneshot
 *   ExecStart=/usr/bin/php /ruta/al/tema/scripts/whatsapp-worker-runner.php
 */

declare(strict_types=1);

/* Buscar wp-load.php hacia arriba desde el directorio del script */
$scriptDir = dirname(__FILE__);
$themeDir  = dirname($scriptDir);  // subir de scripts/ a themes/glorytemplate/
$wpLoad    = '';

/* Permitir --wp-path para override */
$args = $_SERVER['argv'] ?? [];
foreach ($args as $arg) {
    if (str_starts_with($arg, '--wp-path=')) {
        $wpLoad = substr($arg, 10);
        break;
    }
}

/* Buscar wp-load.php desde el theme hacia arriba hasta la raíz de WP */
if ($wpLoad === '' || !file_exists($wpLoad)) {
    $searchDir = $themeDir;
    for ($i = 0; $i < 10; $i++) {
        $candidate = $searchDir . '/wp-load.php';
        if (file_exists($candidate)) {
            $wpLoad = $candidate;
            break;
        }
        $parent = dirname($searchDir);
        if ($parent === $searchDir) {
            break;  // llegamos a la raíz del sistema
        }
        $searchDir = $parent;
    }
}

if ($wpLoad === '' || !file_exists($wpLoad)) {
    fwrite(STDERR, "ERROR: No se encontró wp-load.php. Pasa --wp-path=/ruta/a/wp-load.php\n");
    exit(1);
}

require_once $wpLoad;

/* Verificar que el plugin/tema está cargado */
if (!class_exists('\App\Services\WhatsAppEventWorker')) {
    fwrite(STDERR, "ERROR: Clase WhatsAppEventWorker no encontrada. ¿Está cargado el tema?\n");
    exit(1);
}

try {
    $worker = new \App\Services\WhatsAppEventWorker();
    $worker->run();
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "ERROR en worker: " . $e->getMessage() . "\n");
    exit(1);
}
