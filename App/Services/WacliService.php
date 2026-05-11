<?php

namespace App\Services;

class WacliService
{
    private const BIN_ENV_KEYS = ['WACLI_BIN', 'OPENCLAW_WACLI_BIN'];
    private const ACCOUNT_ENV_KEYS = ['WACLI_ACCOUNT', 'OPENCLAW_WACLI_ACCOUNT'];
    private const RECIPIENT_ENV_KEYS = ['WHATSAPP_AGENT_TO', 'WHATSAPP_TO', 'WHATSAPP'];

    public function estado(): array
    {
        $bin = $this->obtenerBinario();
        $account = $this->obtenerEnv(self::ACCOUNT_ENV_KEYS);
        $recipient = $this->resolverDestinatario(null, false);
        $instalado = $this->comandoDisponible($bin);
        $auth = ['checked' => false, 'authenticated' => false];

        if ($instalado) {
            try {
                $resultado = $this->ejecutarWacli(['--read-only', 'auth', 'status'], 20);
                $json = json_decode($resultado['stdout'], true);
                $auth = is_array($json)
                    ? ['checked' => true, 'authenticated' => (bool)($json['authenticated'] ?? false), 'linked_jid' => $this->mascarar((string)($json['linked_jid'] ?? ''))]
                    : ['checked' => true, 'authenticated' => false, 'raw' => trim($resultado['stdout'])];
            } catch (\Throwable $e) {
                $auth = ['checked' => true, 'authenticated' => false, 'error' => $e->getMessage()];
            }
        }

        return [
            'provider' => 'wacli',
            'installed' => $instalado,
            'localMode' => $this->modoLocalActivo(),
            'bin' => $bin,
            'account' => $account !== '' ? $account : null,
            'defaultRecipientConfigured' => $recipient !== '',
            'defaultRecipientMasked' => $this->mascarar($recipient),
            'auth' => $auth,
            'notes' => [
                'wacli usa WhatsApp como dispositivo vinculado; requiere pairing previo en el servidor.',
                'Los env admitidos son WACLI_BIN, WACLI_ACCOUNT y WHATSAPP_AGENT_TO/WHATSAPP_TO/WHATSAPP.',
            ],
        ];
    }

    public function enviarTexto(?string $to, string $message): array
    {
        $recipient = $this->resolverDestinatario($to, true);
        $message = trim($message);

        if ($message === '') {
            throw new \InvalidArgumentException('El mensaje de WhatsApp no puede estar vacío.');
        }

        if (strlen($message) > 4000) {
            throw new \InvalidArgumentException('El mensaje de WhatsApp supera el límite interno de 4000 caracteres.');
        }

        if (!$this->comandoDisponible($this->obtenerBinario())) {
            if ($this->modoLocalActivo()) {
                return [
                    'provider' => 'wacli-local',
                    'localMode' => true,
                    'toMasked' => $this->mascarar($recipient),
                    'exitCode' => 0,
                    'stdout' => ['message' => 'Envío simulado en local. Instala/autentica wacli para enviar WhatsApp real.'],
                    'stderr' => '',
                ];
            }
            throw new \RuntimeException('wacli no está instalado o no está disponible en PATH.');
        }

        $resultado = $this->ejecutarWacli([
            'send',
            'text',
            '--to',
            $recipient,
            '--message',
            $message,
            '--post-send-wait',
            '2s',
        ], 120);

        $json = json_decode($resultado['stdout'], true);

        return [
            'provider' => 'wacli',
            'toMasked' => $this->mascarar($recipient),
            'exitCode' => $resultado['exitCode'],
            'stdout' => is_array($json) ? $json : trim($resultado['stdout']),
            'stderr' => trim($resultado['stderr']),
        ];
    }

    /**
     * Descarga un archivo de media recibido por WhatsApp usando wacli.
     * [115A-5] Retorna la ruta al archivo temporal. El llamador es responsable de unlink().
     *
     * @param string $directPath  DirectPath del evento Media (ej: /v/f2/...)
     * @param string $mediaKey    MediaKey en base64 para descifrado
     * @param string $mediaType   MIME type (ej: image/jpeg, audio/ogg)
     * @return string             Ruta al archivo temporal descargado
     */
    public function descargarMedia(string $directPath, string $mediaKey, string $mediaType): string
    {
        $ext     = preg_replace('/[^a-z0-9]/', '', explode('/', $mediaType)[1] ?? 'bin') ?: 'bin';
        $tmpFile = sys_get_temp_dir() . '/wacli_media_' . md5($directPath . $mediaKey) . '.' . $ext;

        /* wacli media download --direct-path <path> --media-key <key> --output <file>
         * Gotcha: el comando puede variar según versión de wacli. Si falla, revisar `wacli media --help`. */
        $this->ejecutarWacli([
            'media', 'download',
            '--direct-path', $directPath,
            '--media-key',   $mediaKey,
            '--output',      $tmpFile,
        ], 30);

        if (!file_exists($tmpFile) || filesize($tmpFile) === 0) {
            throw new \RuntimeException('wacli no generó el archivo de media esperado en ' . $tmpFile);
        }

        return $tmpFile;
    }

    public function resolverDestinatario(?string $to, bool $required): string
    {
        $recipient = trim((string)($to ?? ''));
        if ($recipient === '') {
            $recipient = $this->obtenerEnv(self::RECIPIENT_ENV_KEYS);
        }

        if ($recipient === '' && $required) {
            throw new \RuntimeException('No hay destinatario WhatsApp. Configura WHATSAPP_AGENT_TO, WHATSAPP_TO o WHATSAPP.');
        }

        if ($recipient !== '' && !preg_match('/^[A-Za-z0-9@._+\-\s]+$/', $recipient)) {
            throw new \InvalidArgumentException('El destinatario WhatsApp contiene caracteres no permitidos.');
        }

        return $recipient;
    }

    private function ejecutarWacli(array $args, int $timeoutSeconds): array
    {
        if (!function_exists('proc_open')) {
            throw new \RuntimeException('proc_open no está disponible para ejecutar wacli.');
        }

        $bin = $this->obtenerBinario();
        $account = $this->obtenerEnv(self::ACCOUNT_ENV_KEYS);
        $parts = [$bin];

        if ($account !== '') {
            $parts[] = '--account';
            $parts[] = $account;
        }

        $parts[] = '--json';
        $parts[] = '--timeout';
        $parts[] = $timeoutSeconds . 's';
        $parts = array_merge($parts, $args);

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($parts, $descriptorSpec, $pipes);
        if (!is_resource($process)) {
            throw new \RuntimeException('No se pudo iniciar wacli.');
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $exitCode = -1;
        $start = time();

        while (true) {
            $stdout .= stream_get_contents($pipes[1]) ?: '';
            $stderr .= stream_get_contents($pipes[2]) ?: '';
            $status = proc_get_status($process);

            if (!$status['running']) {
                $exitCode = (int)($status['exitcode'] ?? -1);
                break;
            }

            if ((time() - $start) > $timeoutSeconds) {
                proc_terminate($process);
                throw new \RuntimeException('Timeout ejecutando wacli.');
            }

            usleep(100000);
        }

        $stdout .= stream_get_contents($pipes[1]) ?: '';
        $stderr .= stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        if ($exitCode !== 0) {
            $detalle = trim($stderr) !== '' ? trim($stderr) : trim($stdout);
            throw new \RuntimeException('wacli falló: ' . substr($detalle, 0, 500));
        }

        return ['exitCode' => $exitCode, 'stdout' => $stdout, 'stderr' => $stderr];
    }

    private function comandoDisponible(string $bin): bool
    {
        if ($bin === '') {
            return false;
        }

        if (str_contains($bin, DIRECTORY_SEPARATOR) || str_contains($bin, '/')) {
            return is_file($bin) && is_executable($bin);
        }

        $paths = explode(PATH_SEPARATOR, (string)getenv('PATH'));
        $extensions = DIRECTORY_SEPARATOR === '\\'
            ? array_filter(array_map('trim', explode(';', (string)(getenv('PATHEXT') ?: '.COM;.EXE;.BAT;.CMD'))))
            : [''];
        $hasExtension = pathinfo($bin, PATHINFO_EXTENSION) !== '';

        foreach ($paths as $path) {
            $path = trim($path);
            if ($path === '') {
                continue;
            }
            foreach ($extensions as $extension) {
                $candidate = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $bin . ($hasExtension ? '' : $extension);
                if (is_file($candidate) && (DIRECTORY_SEPARATOR === '\\' || is_executable($candidate))) {
                    return true;
                }
            }
        }

        return false;
    }

    private function obtenerBinario(): string
    {
        $bin = $this->obtenerEnv(self::BIN_ENV_KEYS);
        return $bin !== '' ? $bin : 'wacli';
    }

    private function obtenerEnv(array $keys): string
    {
        return EnvService::first($keys);
    }

    private function modoLocalActivo(): bool
    {
        $flag = EnvService::get('WACLI_LOCAL_MODE');
        if ($flag !== '') {
            return filter_var($flag, FILTER_VALIDATE_BOOLEAN);
        }
        return filter_var(EnvService::get('LOCAL'), FILTER_VALIDATE_BOOLEAN) || filter_var(EnvService::get('DEV'), FILTER_VALIDATE_BOOLEAN);
    }

    private function mascarar(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $length = strlen($value);
        if ($length <= 6) {
            return str_repeat('*', $length);
        }

        return substr($value, 0, 3) . str_repeat('*', max(0, $length - 6)) . substr($value, -3);
    }
}
