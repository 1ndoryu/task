<?php
/* sentinel-disable-file proc-open-escapado: wrapper único de systemd; todos los argumentos
 * pasan por escapeshellarg() antes de proc_open y no se acepta input libre del usuario. */

namespace App\Services;

/**
 * [125A-10] Frontera única para systemd de cuentas wacli multiusuario.
 * Mantiene los comandos sudo acotados y escapados para no mezclar shell
 * infrastructure con la lógica de cuentas en WacliManagerService.
 */
class WacliSystemdService
{
    public function start(string $serviceName): void
    {
        $this->run(['systemctl', 'start', $serviceName]);
    }

    public function stop(string $serviceName): void
    {
        $this->run(['systemctl', 'stop', $serviceName]);
    }

    public function isActive(string $serviceName): bool
    {
        try {
            return trim($this->run(['systemctl', 'is-active', $serviceName])) === 'active';
        } catch (\Throwable) {
            return false;
        }
    }

    private function run(array $command): string
    {
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = proc_open('sudo ' . implode(' ', array_map('escapeshellarg', $command)), $descriptorSpec, $pipes);
        if (!is_resource($process)) {
            throw new \RuntimeException('No se pudo ejecutar systemd.');
        }
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);
        if ($exitCode !== 0) {
            $detalle = trim($stderr) !== '' ? trim($stderr) : trim($stdout);
            throw new \RuntimeException('systemd falló: ' . substr($detalle, 0, 300));
        }
        return $stdout;
    }
}