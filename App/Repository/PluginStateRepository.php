<?php

namespace App\Repository;

use App\Repository\CifradoTrait;
use App\Services\UserTimeService;

class PluginStateRepository
{
    use CifradoTrait;

    private const META_AYUNO = '_glory_plugin_ayuno';
    private const META_DEFICIT_CALORICO = '_glory_plugin_deficit_calorico';
    private const MAX_HISTORIAL_AYUNO = 60;
    private const MAX_COMIDAS = 300;
    private const MAX_HISTORIAL_DEFICIT = 30;

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('ID de usuario invalido');
        }

        $this->userId = $userId;
        $this->inicializarCifrado();
    }

    public function getAyuno(): array
    {
        $stored = $this->getState(self::META_AYUNO, []);
        return $this->normalizarAyuno($stored);
    }

    public function setAyuno(array $state, bool $protectStale = false): bool
    {
        return $this->setState(self::META_AYUNO, $this->normalizarAyuno($state), $protectStale);
    }

    public function getDeficitCalorico(): array
    {
        $stored = $this->getState(self::META_DEFICIT_CALORICO, []);
        return $this->normalizarDeficitCalorico($stored);
    }

    public function setDeficitCalorico(array $state, bool $protectStale = false): bool
    {
        return $this->setState(self::META_DEFICIT_CALORICO, $this->normalizarDeficitCalorico($state), $protectStale);
    }

    public function deleteAll(): bool
    {
        delete_user_meta($this->userId, self::META_AYUNO);
        delete_user_meta($this->userId, self::META_DEFICIT_CALORICO);
        return true;
    }

    private function getState(string $metaKey, array $default): array
    {
        $data = get_user_meta($this->userId, $metaKey, true);
        $decoded = $this->decodeData($data, $default);
        return is_array($decoded) ? $decoded : $default;
    }

    private function setState(string $metaKey, array $state, bool $protectStale = false): bool
    {
        if ($protectStale) {
            $current = $this->getState($metaKey, []);
            $currentUpdatedAt = (int)($current['updatedAt'] ?? 0);
            $incomingUpdatedAt = (int)($state['updatedAt'] ?? 0);
            if ($currentUpdatedAt > 0 && $incomingUpdatedAt < $currentUpdatedAt) {
                return true;
            }
        } else {
            $state['updatedAt'] = $this->timestampMs();
        }

        if (empty($state['updatedAt'])) {
            $state['updatedAt'] = $this->timestampMs();
        }

        $encoded = $this->encodeData($state);
        $updated = update_user_meta($this->userId, $metaKey, $encoded);
        if ($updated !== false) {
            return true;
        }
        /* update_user_meta devuelve false cuando (a) el valor no cambio (OK) o (b) error de BD.
         * Distinguir usando $wpdb->last_error: si hay error es fallo real, si no hay error es
         * 'sin cambios' y el guardado fue exitoso. La comparacion de strings ciframos/no-ciframos
         * era fragil — el IV aleatorio hace que el string cambie aunque el contenido sea igual. */
        global $wpdb;
        if (!empty($wpdb->last_error)) {
            error_log('[PluginStateRepo] DB error en setState ' . $metaKey . ': ' . $wpdb->last_error);
            return false;
        }
        return true;
    }

    private function normalizarAyuno(array $state): array
    {
        $estado = in_array((string)($state['estado'] ?? 'inactivo'), ['inactivo', 'activo', 'completado'], true)
            ? (string)$state['estado'] : 'inactivo';

        $historial = array_values(array_filter(array_map(
            fn($sesion) => is_array($sesion) ? $this->normalizarSesionAyuno($sesion) : null,
            (array)($state['historial'] ?? [])
        )));

        $sesionActiva = $this->normalizarSesionActiva($state['sesionActiva'] ?? null);
        if ($estado === 'activo' && $sesionActiva === null) {
            $estado = 'inactivo';
        }

        return [
            'estado' => $estado,
            'sesionActiva' => $sesionActiva,
            'historial' => array_slice($historial, 0, self::MAX_HISTORIAL_AYUNO),
            'ultimoAyunoCompletado' => isset($state['ultimoAyunoCompletado']) && is_array($state['ultimoAyunoCompletado'])
                ? $this->normalizarSesionAyuno($state['ultimoAyunoCompletado'])
                : null,
            'updatedAt' => max(0, (int)($state['updatedAt'] ?? 0)),
        ];
    }

    private function normalizarSesionActiva(mixed $sesion): ?array
    {
        if (!is_array($sesion) || empty($sesion['id'])) {
            return null;
        }

        return [
            'id' => sanitize_key((string)$sesion['id']),
            'inicio' => max(0, (int)($sesion['inicio'] ?? 0)),
            'horaUltimaComidaMs' => isset($sesion['horaUltimaComidaMs']) ? max(0, (int)$sesion['horaUltimaComidaMs']) : null,
            'duracionObjetivoMs' => max(1, (int)($sesion['duracionObjetivoMs'] ?? 16 * 3600000)),
        ];
    }

    private function normalizarSesionAyuno(array $sesion): array
    {
        return [
            'id' => sanitize_key((string)($sesion['id'] ?? 'ayuno_' . time())),
            'inicio' => max(0, (int)($sesion['inicio'] ?? 0)),
            'fin' => isset($sesion['fin']) ? max(0, (int)$sesion['fin']) : null,
            'horaUltimaComidaMs' => isset($sesion['horaUltimaComidaMs']) ? max(0, (int)$sesion['horaUltimaComidaMs']) : null,
            'duracionObjetivoMs' => max(1, (int)($sesion['duracionObjetivoMs'] ?? 16 * 3600000)),
            'completada' => (bool)($sesion['completada'] ?? false),
            'cancelada' => (bool)($sesion['cancelada'] ?? false),
            'tiempoEfectivoMs' => max(0, (int)($sesion['tiempoEfectivoMs'] ?? 0)),
        ];
    }

    private function normalizarDeficitCalorico(array $state): array
    {
        $comidas = array_values(array_filter(array_map(
            fn($comida) => is_array($comida) ? $this->normalizarComida($comida) : null,
            (array)($state['comidas'] ?? [])
        )));

        return [
            'datosUsuario' => $this->normalizarDatosUsuario((array)($state['datosUsuario'] ?? [])),
            'apiKeyGemini' => '',
            'comidas' => array_slice($comidas, -self::MAX_COMIDAS),
            'historial' => array_slice((array)($state['historial'] ?? []), 0, self::MAX_HISTORIAL_DEFICIT),
            'cargandoIA' => false,
            'errorIA' => null,
            'updatedAt' => max(0, (int)($state['updatedAt'] ?? 0)),
        ];
    }

    private function timestampMs(): int
    {
        return (int)floor(microtime(true) * 1000);
    }

    private function normalizarDatosUsuario(array $datos): array
    {
        $normalizado = [];
        foreach (['altura', 'peso', 'cintura', 'edad', 'ejercicioSesiones', 'ejercicioMinutos'] as $campo) {
            if (isset($datos[$campo]) && is_numeric($datos[$campo])) {
                $normalizado[$campo] = (float)$datos[$campo];
            }
        }
        if (in_array((string)($datos['sexo'] ?? ''), ['masculino', 'femenino'], true)) {
            $normalizado['sexo'] = (string)$datos['sexo'];
        }
        if (in_array((string)($datos['objetivoDeficit'] ?? ''), ['bajo', 'moderado', 'alto', 'peligroso'], true)) {
            $normalizado['objetivoDeficit'] = (string)$datos['objetivoDeficit'];
        }
        return $normalizado;
    }

    private function normalizarComida(array $comida): array
    {
        return [
            'id' => sanitize_key((string)($comida['id'] ?? 'comida_' . time())),
            'descripcion' => sanitize_text_field((string)($comida['descripcion'] ?? 'Comida')),
            'calorias' => max(0, (int)round((float)($comida['calorias'] ?? 0))),
            'proteinas' => max(0, (int)round((float)($comida['proteinas'] ?? 0))),
            'carbohidratos' => max(0, (int)round((float)($comida['carbohidratos'] ?? 0))),
            'grasas' => max(0, (int)round((float)($comida['grasas'] ?? 0))),
            'azucar' => max(0, (int)round((float)($comida['azucar'] ?? 0))),
            'fotoUrl' => isset($comida['fotoUrl']) ? esc_url_raw((string)$comida['fotoUrl']) : null,
            'horaRegistro' => max(0, (int)($comida['horaRegistro'] ?? 0)),
            'fecha' => isset($comida['fecha']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$comida['fecha'])
                ? (string)$comida['fecha']
                : UserTimeService::today($this->userId),
            'fuenteEstimacion' => in_array((string)($comida['fuenteEstimacion'] ?? ''), ['ia', 'manual'], true) ? (string)$comida['fuenteEstimacion'] : 'manual',
            'promptOriginal' => isset($comida['promptOriginal']) ? sanitize_text_field((string)$comida['promptOriginal']) : null,
            'logProceso' => array_values(array_filter(array_map('sanitize_text_field', (array)($comida['logProceso'] ?? [])))),
        ];
    }
}
