<?php

namespace App\Services;

/**
 * [125B-1] Gestor multi-account de wacli.
 *
 * Orquesta múltiples instancias wacli, una por usuario de WordPress.
 * Cada usuario tiene su propio --account (user_{userId}) y store aislado.
 *
 * Dependencias:
 *   - glory_whatsapp_accounts (tabla BD) para mapeo userId → account_name
 *   - WacliService::ejecutarComoUsuario() para ejecución per-user
 *   - systemd wacli-sync@.service template para sync persistente
 *
 * Seguridad:
 *   - Toda invocación proc_open sanitiza argumentos con escapeshellarg()
 *   - account_name y store_path vienen de la BD, no del input del usuario
 *   - El userId se valida contra glory_whatsapp_accounts antes de ejecutar
 *
 * @package App\Services
 */
class WacliManagerService
{
    private \wpdb $wpdb;
    private string $tablaCuentas;
    private string $baseStoreDir;
    private WacliService $wacli;
    private WacliSystemdService $systemd;
    private WacliAlertService $alertas;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;
        $this->tablaCuentas = $wpdb->prefix . 'glory_whatsapp_accounts';
        $this->baseStoreDir = '/data/wacli/users';
        $this->wacli = new WacliService();
        $this->systemd = new WacliSystemdService();
        $this->alertas = new WacliAlertService();
    }

    /**
     * Obtiene el store path para un usuario.
     * Formato: /data/wacli/users/user_{userId}/store
     */
    public function obtenerStoreDir(int $userId): string
    {
        return $this->baseStoreDir . '/user_' . $userId . '/store';
    }

    /**
     * Obtiene el account name para un usuario.
     * Formato: user_{userId}
     */
    public function obtenerAccountName(int $userId): string
    {
        return 'user_' . $userId;
    }

    /**
     * Registra un nuevo usuario WhatsApp.
     *
     * 1. Crea fila en glory_whatsapp_accounts con status_transition='registering'
     * 2. Crea directorio de store
     * 3. Ejecuta wacli --account user_X auth para generar QR
     * 4. Si falla: hace rollback (limpia fila + directorio)
     * 5. Si ok: actualiza status_transition=NULL, authenticated=0, retorna QR
     *
     * @param int    $userId       ID del usuario WordPress
     * @param string $phonePrimary Número E.164 (ej: +584141234567)
     * @return array               ['ok' => bool, 'qr' => string, 'accountName' => string]
     */
    public function registrarUsuario(int $userId, string $phonePrimary): array
    {
        $accountName = $this->obtenerAccountName($userId);
        $storePath   = $this->obtenerStoreDir($userId);

        /* Validar que no exista ya */
        $existente = $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT id FROM {$this->tablaCuentas} WHERE user_id = %d",
                $userId
            )
        );
        if ($existente) {
            throw new \RuntimeException('El usuario ya tiene una cuenta WhatsApp registrada.');
        }

        /* Paso 1: Insertar fila con estado transitorio */
        $insertado = $this->wpdb->insert($this->tablaCuentas, [
            'user_id'           => $userId,
            'account_name'      => $accountName,
            'phone_primary'     => $phonePrimary,
            'store_path'        => $storePath,
            'authenticated'     => 0,
            'enabled'           => 1,
            'status_transition' => 'registering',
            'health_status'     => 'unknown',
        ]);

        if ($insertado === false) {
            throw new \RuntimeException(
                'No se pudo crear la cuenta WhatsApp: ' . $this->wpdb->last_error
            );
        }

        /* Paso 2: Crear directorio de store */
        if (!is_dir($storePath)) {
            if (!wp_mkdir_p($storePath)) {
                $rollbackOk = $this->rollbackRegistro($userId, $storePath);
                if (!$rollbackOk) {
                    error_log('[WacliManager] Rollback incompleto tras fallo creando store user ' . $userId);
                }
                throw new \RuntimeException('No se pudo crear el directorio de store: ' . $storePath);
            }
        }

        /* Paso 3: Ejecutar wacli auth para generar QR */
        try {
            $resultado = $this->wacli->ejecutarComoUsuario($userId, ['auth'], 120);
        } catch (\Throwable $e) {
            $rollbackOk = $this->rollbackRegistro($userId, $storePath);
            if (!$rollbackOk) {
                error_log('[WacliManager] Rollback incompleto tras fallo de auth user ' . $userId);
            }
            throw new \RuntimeException('Error al iniciar autenticación wacli: ' . $e->getMessage());
        }

        /* Extraer QR del output — wacli auth devuelve ASCII art o base64 */
        $qrOutput = $resultado['stdout'];

        /* Paso 5: Actualizar estado (registro exitoso) */
        $actualizado = $this->wpdb->update(
            $this->tablaCuentas,
            [
                'status_transition' => null,
                'health_status'     => 'healthy',
            ],
            ['user_id' => $userId]
        );
        if ($actualizado === false) {
            throw new \RuntimeException('No se pudo finalizar el registro WhatsApp: ' . $this->wpdb->last_error);
        }

        error_log('[WacliManager] Usuario registrado: ' . $accountName);

        return [
            'ok'          => true,
            'qr'          => $qrOutput,
            'accountName' => $accountName,
        ];
    }

    /**
     * Rollback de registro: limpia BD y directorio.
     */
    private function rollbackRegistro(int $userId, string $storePath): bool
    {
        $borrado = $this->wpdb->delete($this->tablaCuentas, ['user_id' => $userId]);
        if ($borrado === false) {
            error_log('[WacliManager] Error borrando cuenta en rollback user ' . $userId . ': ' . $this->wpdb->last_error);
        }

        /* [Fase-7] Log de rollback */
        error_log('[WacliManager] ROLLBACK registro user ' . $userId . ', store: ' . $storePath);

        /* Eliminar directorio recursivamente */
        $directorioOk = $this->eliminarDirectorio($storePath);
        return $borrado !== false && $directorioOk;
    }

    /**
     * Elimina un directorio recursivamente.
     */
    private function eliminarDirectorio(string $path): bool
    {
        if (!is_dir($path)) {
            return true;
        }
        $ok = true;
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $realPath = $item->getRealPath();
            if ($realPath === false) {
                $ok = false;
                continue;
            }
            if ($item->isDir()) {
                if (!rmdir($realPath)) {
                    error_log('[WacliManager] No se pudo borrar directorio: ' . $realPath);
                    $ok = false;
                }
            } else {
                if (!unlink($realPath)) {
                    error_log('[WacliManager] No se pudo borrar archivo: ' . $realPath);
                    $ok = false;
                }
            }
        }
        if (!rmdir($path)) {
            error_log('[WacliManager] No se pudo borrar directorio raíz: ' . $path);
            $ok = false;
        }
        return $ok;
    }

    /**
     * Genera/renueva el código QR para un usuario.
     * Rate limit: máximo 1 vez cada 30s por usuario (controlado por el endpoint).
     *
     * @param int $userId
     * @return string Output del QR desde wacli (ASCII art o base64)
     */
    public function generarCodigoQR(int $userId): string
    {
        $this->validarCuentaActiva($userId);

        /* [Fase-7] Log de generación de QR */
        error_log('[WacliManager] QR generado para user ' . $userId);

        /* regenerar QR: wacli auth --renew o similar */
        $resultado = $this->wacli->ejecutarComoUsuario($userId, ['auth', '--renew'], 60);

        return $resultado['stdout'];
    }

    /**
     * Verifica el estado de autenticación de un usuario.
     *
     * @param int $userId
     * @return array ['authenticated' => bool, 'linked_jid' => ?string]
     */
    public function verificarAuth(int $userId): array
    {
        $cuenta = $this->obtenerCuenta($userId);
        if (!$cuenta) {
            return ['authenticated' => false, 'linked_jid' => null];
        }

        /* Si ya está authenticated en BD, devolver rápido */
        if ((int)$cuenta->authenticated === 1) {
            return [
                'authenticated' => true,
                'linked_jid'    => $cuenta->linked_jid,
            ];
        }

        try {
            $resultado = $this->wacli->ejecutarComoUsuario($userId, ['--read-only', 'auth', 'status'], 20);
            $json = $this->decodificarJsonWacli($resultado['stdout'], 'auth status user ' . $userId);
            $authenticated = (bool)($json['authenticated'] ?? false);
            $linkedJid     = (string)($json['linked_jid'] ?? $cuenta->linked_jid ?? '');

            if ($authenticated && !$cuenta->authenticated) {
                /* Actualizar BD cuando se autentica */
                $actualizado = $this->wpdb->update(
                    $this->tablaCuentas,
                    [
                        'authenticated' => 1,
                        'linked_jid'    => $linkedJid ?: null,
                        'jid_primary'   => $linkedJid ?: null,
                    ],
                    ['user_id' => $userId]
                );
                if ($actualizado === false) {
                    throw new \RuntimeException('No se pudo guardar autenticación WhatsApp: ' . $this->wpdb->last_error);
                }
                try {
                    $this->iniciarSync($userId);
                } catch (\Throwable $syncError) {
                    error_log('[WacliManager] Auth OK pero no se pudo iniciar sync user ' . $userId . ': ' . $syncError->getMessage());
                    $degradado = $this->wpdb->update(
                        $this->tablaCuentas,
                        ['health_status' => 'degraded'],
                        ['user_id' => $userId]
                    );
                    if ($degradado === false) {
                        error_log('[WacliManager] No se pudo marcar degraded user ' . $userId . ': ' . $this->wpdb->last_error);
                    }
                }
            }

            return [
                'authenticated' => $authenticated,
                'linked_jid'    => $linkedJid ?: null,
            ];
        } catch (\Throwable $e) {
            error_log('[WacliManager] Error verificando auth user ' . $userId . ': ' . $e->getMessage());
            return ['authenticated' => false, 'linked_jid' => $cuenta->linked_jid];
        }
    }

    /**
     * Envía un mensaje de texto como un usuario específico.
     *
     * @param int    $userId
     * @param string $jid     JID del destinatario
     * @param string $message Contenido
     * @return array
     */
    public function enviarTexto(int $userId, string $jid, string $message): array
    {
        $this->validarCuentaActiva($userId);
        return $this->wacli->enviarTextoComoUsuario($userId, $jid, $message);
    }

    /**
     * Descarga un archivo de media como un usuario específico.
     *
     * @param int    $userId
     * @param string $chat      JID del chat
     * @param string $messageId ID del mensaje
     * @param string $mediaType MIME type
     * @return string           Ruta al archivo temporal
     */
    public function descargarMedia(int $userId, string $chat, string $messageId, string $mediaType): string
    {
        $this->validarCuentaActiva($userId);

        /* Usar el método multi-account de WacliService */
        $baseMime = trim(explode(';', $mediaType)[0]);
        $ext      = preg_replace('/[^a-z0-9]/', '', explode('/', $baseMime)[1] ?? 'bin') ?: 'bin';
        $uploadDir = wp_upload_dir();
        $tmpFile   = rtrim($uploadDir['basedir'], '/\\') . '/glory_media_temp/wacli_media_' . md5($chat . $messageId) . '.' . $ext;

        $this->wacli->ejecutarComoUsuario($userId, [
            'media', 'download',
            '--chat',   $chat,
            '--id',     $messageId,
            '--output', $tmpFile,
        ], 45);

        if (!file_exists($tmpFile) || filesize($tmpFile) === 0) {
            throw new \RuntimeException('wacli no generó el archivo de media esperado en ' . $tmpFile);
        }

        return $tmpFile;
    }

    /**
     * Inicia el sync persistente vía systemd.
     * Crea/arranca wacli-sync@user_{userId}.service
     */
    public function iniciarSync(int $userId): void
    {
        $this->validarCuentaActiva($userId);

        $serviceName = 'wacli-sync@user_' . $userId;
        $this->systemd->start($serviceName);
    }

    /**
     * Detiene el sync persistente vía systemd.
     */
    public function detenerSync(int $userId): void
    {
        $serviceName = 'wacli-sync@user_' . $userId;
        $this->systemd->stop($serviceName);
    }

    /**
     * Verifica el estado de salud de una cuenta.
     *
     * @param int $userId
     * @return string 'healthy' | 'degraded' | 'dead'
     */
    public function healthCheck(int $userId): string
    {
        $cuenta = $this->obtenerCuenta($userId);
        if (!$cuenta) {
            return 'dead';
        }

        /* 1. Verificar systemd */
        $serviceName = 'wacli-sync@user_' . $userId;
        $isActive = $this->systemd->isActive($serviceName);

        /* 2. Verificar auth status */
        $authOk = false;
        try {
            $authResult = $this->wacli->ejecutarComoUsuario($userId, ['--read-only', 'auth', 'status'], 15);
            $json = $this->decodificarJsonWacli($authResult['stdout'], 'health auth user ' . $userId);
            $authOk = (bool)($json['authenticated'] ?? false);
        } catch (\Throwable $e) {
            /* si falla, degradado */
        }

        $healthStatus = match (true) {
            $isActive && $authOk => 'healthy',
            $isActive || $authOk => 'degraded',
            default              => 'dead',
        };

        $actualizado = $this->wpdb->update(
            $this->tablaCuentas,
            [
                'health_status'     => $healthStatus,
                'last_health_check' => current_time('mysql'),
            ],
            ['user_id' => $userId]
        );
        if ($actualizado === false) {
            error_log('[WacliManager] No se pudo guardar health user ' . $userId . ': ' . $this->wpdb->last_error);
        }

        return $healthStatus;
    }

    /**
     * Desvincula un usuario: detiene sync, limpia store, marca BD.
     */
    public function desvincular(int $userId): bool
    {
        $cuenta = $this->obtenerCuenta($userId);
        if (!$cuenta) {
            return true;
        }

        /* Detener sync si está corriendo */
        try {
            $this->detenerSync($userId);
        } catch (\Throwable $e) {
            error_log('[WacliManager] Error deteniendo sync user ' . $userId . ': ' . $e->getMessage());
        }

        /* Limpiar store */
        if ($cuenta->store_path && is_dir($cuenta->store_path)) {
            $limpio = $this->eliminarDirectorio($cuenta->store_path);
            if (!$limpio) {
                error_log('[WacliManager] Limpieza incompleta de store user ' . $userId);
            }
        }

        /* Resetear BD */
        $actualizado = $this->wpdb->update(
            $this->tablaCuentas,
            [
                'jid_primary'       => null,
                'authenticated'     => 0,
                'linked_jid'        => null,
                'health_status'     => 'unknown',
            ],
            ['user_id' => $userId]
        );
        if ($actualizado === false) {
            error_log('[WacliManager] Error reseteando cuenta user ' . $userId . ': ' . $this->wpdb->last_error);
            return false;
        }

        error_log('[WacliManager] Usuario desvinculado: user_' . $userId);
        return true;
    }

    /**
     * Lista todas las cuentas activas (enabled = 1).
     *
     * @return array Lista de objetos con datos de cuenta
     */
    public function listarCuentasActivas(): array
    {
        $rows = $this->wpdb->get_results(
            "SELECT user_id, account_name, phone_primary, jid_primary,
                    authenticated, enabled, blocked,
                    daily_msg_count, daily_msg_date,
                    health_status, last_sync, last_health_check
             FROM {$this->tablaCuentas}
             WHERE enabled = 1 AND authenticated = 1
             ORDER BY user_id ASC"
        );

        return $rows ?: [];
    }

    // ─── Health check sweep ─────────────────────────────────────────

    /**
     * [Fase-7] Ejecuta health check sobre todas las cuentas activas.
     * Las cuentas 'dead' se deshabilitan automáticamente y se notifica al admin.
     * Llamado por cron cada 15 minutos.
     *
     * @return array{checked: int, dead: int, disabled: int}
     */
    public function runHealthCheckSweep(): array
    {
        $cuentas = $this->wpdb->get_results(
            "SELECT user_id, account_name, phone_primary FROM {$this->tablaCuentas}
             WHERE enabled = 1 AND authenticated = 1"
        );

        $checked  = 0;
        $dead     = 0;
        $disabled = 0;

        foreach ($cuentas as $cuenta) {
            $accountName = (string)$cuenta->account_name;
            if (!str_starts_with($accountName, 'user_') || $this->esCuentaLegacyAdmin($accountName)) {
                continue;
            }
            $checked++;
            $status = $this->healthCheck((int)$cuenta->user_id);

            if ($status === 'dead') {
                $dead++;
                error_log('[WacliManager] Health: DESHABILITADO ' . $cuenta->account_name
                    . ' (user ' . $cuenta->user_id . ', tel ' . $cuenta->phone_primary . ')');

                /* Deshabilitar */
                $actualizado = $this->wpdb->update(
                    $this->tablaCuentas,
                    ['enabled' => 0, 'health_status' => 'dead'],
                    ['user_id' => $cuenta->user_id]
                );
                if ($actualizado === false) {
                    error_log('[WacliManager] No se pudo deshabilitar cuenta ' . $cuenta->account_name . ': ' . $this->wpdb->last_error);
                    continue;
                }
                $disabled++;

                /* Notificar admin */
                $this->alertas->notificarAdminFallo($cuenta);
            } elseif ($status === 'degraded') {
                error_log('[WacliManager] Health: DEGRADADO ' . $cuenta->account_name
                    . ' (user ' . $cuenta->user_id . ')');
            }
        }

        error_log('[WacliManager] Health sweep: ' . $checked . ' cuentas, '
            . $dead . ' muertas, ' . $disabled . ' deshabilitadas');
        return ['checked' => $checked, 'dead' => $dead, 'disabled' => $disabled];
    }

    // ─── helpers ───────────────────────────────────────────────────

    /**
     * Valida que la cuenta exista y esté activa.
     *
     * @throws \RuntimeException
     */
    private function validarCuentaActiva(int $userId): object
    {
        $cuenta = $this->obtenerCuenta($userId);
        if (!$cuenta) {
            throw new \RuntimeException("Cuenta WhatsApp no encontrada para user_id={$userId}");
        }
        if (!$cuenta->enabled) {
            throw new \RuntimeException("Cuenta WhatsApp deshabilitada para user_id={$userId}");
        }
        return $cuenta;
    }

    private function esCuentaLegacyAdmin(string $accountName): bool
    {
        $adminAccount = EnvService::first(['WACLI_ACCOUNT', 'OPENCLAW_WACLI_ACCOUNT']);
        return $adminAccount !== '' && hash_equals($adminAccount, $accountName);
    }

    /**
     * Obtiene la fila de glory_whatsapp_accounts para un userId.
     */
    private function obtenerCuenta(int $userId): ?object
    {
        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->tablaCuentas} WHERE user_id = %d",
                $userId
            )
        );
        return $row ?: null;
    }

    private function decodificarJsonWacli(string $stdout, string $contexto): array
    {
        $json = json_decode($stdout, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($json)) {
            throw new \RuntimeException('Respuesta JSON inválida de wacli (' . $contexto . '): ' . json_last_error_msg());
        }
        return $json;
    }
}
