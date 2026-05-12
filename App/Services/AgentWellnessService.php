<?php

namespace App\Services;

use App\Repository\HabitosRepository;
use App\Repository\PluginStateRepository;

class AgentWellnessService
{
    private const DEFAULT_FAST_HOURS = 16;
    private const MIN_FAST_FOR_HABIT_MS = 12 * 3600000;

    public function iniciarAyuno(int $userId, array $params, string $canal): array
    {
        $repo = new PluginStateRepository($userId);
        $state = $repo->getAyuno();
        if (($state['estado'] ?? '') === 'activo' && !empty($state['sesionActiva'])) {
            return ['exito' => false, 'error' => 'Ya hay un ayuno activo.', 'estado' => $this->estadoAyuno($userId, $canal)];
        }

        $duracionHoras = $this->normalizarDuracionHoras($params['duracion_horas'] ?? $params['duracionHoras'] ?? null);
        $inicioMs = $this->parseTimestampMs($params['hora_ultima_comida'] ?? $params['horaUltimaComida'] ?? $params['inicio'] ?? null, $userId, $canal);

        $sesion = [
            'id' => $this->generarId('ayuno'),
            'inicio' => $inicioMs,
            'horaUltimaComidaMs' => $inicioMs,
            'duracionObjetivoMs' => $duracionHoras * 3600000,
        ];

        $state['estado'] = 'activo';
        $state['sesionActiva'] = $sesion;

        return [
            'exito' => $repo->setAyuno($state),
            'estado' => 'activo',
            'inicio' => $this->formatearMs($inicioMs, $userId, $canal),
            'duracion_horas' => $duracionHoras,
            'sesion' => $sesion,
        ];
    }

    public function terminarAyuno(int $userId, array $params, string $canal): array
    {
        $repo = new PluginStateRepository($userId);
        $state = $repo->getAyuno();
        $activa = $state['sesionActiva'] ?? null;
        if (($state['estado'] ?? '') !== 'activo' || !is_array($activa)) {
            return ['exito' => false, 'error' => 'No hay un ayuno activo para terminar.'];
        }

        $finMs = $this->parseTimestampMs($params['fin'] ?? $params['fin_iso'] ?? $params['finIso'] ?? null, $userId, $canal);
        $inicioMs = (int)($activa['inicio'] ?? $finMs);
        $tiempoMs = max(0, $finMs - $inicioMs);
        $objetivoMs = max(1, (int)($activa['duracionObjetivoMs'] ?? self::DEFAULT_FAST_HOURS * 3600000));
        $completada = $tiempoMs >= $objetivoMs;

        $sesionFinalizada = [
            'id' => (string)($activa['id'] ?? $this->generarId('ayuno')),
            'inicio' => $inicioMs,
            'fin' => $finMs,
            'horaUltimaComidaMs' => $activa['horaUltimaComidaMs'] ?? $inicioMs,
            'duracionObjetivoMs' => $objetivoMs,
            'completada' => $completada,
            'cancelada' => false,
            'tiempoEfectivoMs' => $tiempoMs,
        ];

        $historial = array_values((array)($state['historial'] ?? []));
        array_unshift($historial, $sesionFinalizada);
        $state['estado'] = 'inactivo';
        $state['sesionActiva'] = null;
        $state['historial'] = array_slice($historial, 0, 60);
        $state['ultimoAyunoCompletado'] = $sesionFinalizada;

        $habitResult = $tiempoMs >= self::MIN_FAST_FOR_HABIT_MS
            ? $this->completarHabitoAyuno($userId, $this->fechaLocal($finMs, $userId, $canal))
            : ['marcado' => false, 'razon' => 'duracion_menor_12h'];

        return [
            'exito' => $repo->setAyuno($state),
            'estado' => 'inactivo',
            'inicio' => $this->formatearMs($inicioMs, $userId, $canal),
            'fin' => $this->formatearMs($finMs, $userId, $canal),
            'duracion' => $this->formatearDuracion($tiempoMs),
            'duracion_ms' => $tiempoMs,
            'completada' => $completada,
            'habito_ayuno' => $habitResult,
            'sesion' => $sesionFinalizada,
        ];
    }

    public function estadoAyuno(int $userId, string $canal): array
    {
        $state = (new PluginStateRepository($userId))->getAyuno();
        $activa = $state['sesionActiva'] ?? null;
        if (($state['estado'] ?? '') === 'activo' && is_array($activa)) {
            $ahoraMs = $this->parseTimestampMs(null, $userId, $canal);
            $inicioMs = (int)($activa['inicio'] ?? $ahoraMs);
            $objetivoMs = max(1, (int)($activa['duracionObjetivoMs'] ?? self::DEFAULT_FAST_HOURS * 3600000));
            $transcurrido = max(0, $ahoraMs - $inicioMs);

            return [
                'estado' => 'activo',
                'inicio' => $this->formatearMs($inicioMs, $userId, $canal),
                'transcurrido' => $this->formatearDuracion($transcurrido),
                'restante' => $this->formatearDuracion(max(0, $objetivoMs - $transcurrido)),
                'objetivo_horas' => round($objetivoMs / 3600000, 2),
                'completado_objetivo' => $transcurrido >= $objetivoMs,
            ];
        }

        $ultimo = $state['ultimoAyunoCompletado'] ?? null;
        return [
            'estado' => 'inactivo',
            'ultimo' => is_array($ultimo) ? [
                'inicio' => $this->formatearMs((int)($ultimo['inicio'] ?? 0), $userId, $canal),
                'fin' => $this->formatearMs((int)($ultimo['fin'] ?? 0), $userId, $canal),
                'duracion' => $this->formatearDuracion((int)($ultimo['tiempoEfectivoMs'] ?? 0)),
                'completada' => (bool)($ultimo['completada'] ?? false),
            ] : null,
        ];
    }

    public function registrarComida(int $userId, array $params, string $canal): array
    {
        $descripcion = trim(sanitize_text_field((string)($params['descripcion'] ?? '')));
        if ($descripcion === '') {
            throw new \LogicException('registrar_comida requiere descripcion.');
        }

        $fecha = $this->fechaLocal($this->parseTimestampMs($params['fecha'] ?? null, $userId, $canal), $userId, $canal);
        $caloriasManual = isset($params['calorias']) && is_numeric($params['calorias']) ? (int)$params['calorias'] : null;
        $nutricion = $caloriasManual !== null && $caloriasManual > 0
            ? $this->nutricionManual($descripcion, (int)$params['calorias'], $params)
            : $this->estimarNutricion($userId, $descripcion);

        $repo = new PluginStateRepository($userId);
        $state = $repo->getDeficitCalorico();
        $comida = [
            'id' => $this->generarId('comida'),
            'descripcion' => $nutricion['descripcion'] ?? ucfirst($descripcion),
            'calorias' => (int)$nutricion['calorias'],
            'proteinas' => (int)($nutricion['proteinas'] ?? 0),
            'carbohidratos' => (int)($nutricion['carbohidratos'] ?? 0),
            'grasas' => (int)($nutricion['grasas'] ?? 0),
            'azucar' => (int)($nutricion['azucar'] ?? 0),
            'horaRegistro' => $this->parseTimestampMs(null, $userId, $canal),
            'fecha' => $fecha,
            'fuenteEstimacion' => $nutricion['fuente'],
            'promptOriginal' => $descripcion,
            'logProceso' => $nutricion['logProceso'] ?? [],
        ];

        $state['comidas'][] = $comida;
        $ok = $repo->setDeficitCalorico($state);
        $resumen = $this->resumenCalorias($userId, ['fecha' => $fecha], $canal);

        return [
            'exito' => $ok,
            'comida' => $comida,
            'resumen_dia' => $resumen,
        ];
    }

    public function resumenCalorias(int $userId, array $params, string $canal): array
    {
        $fecha = $this->fechaLocal($this->parseTimestampMs($params['fecha'] ?? null, $userId, $canal), $userId, $canal);
        $state = (new PluginStateRepository($userId))->getDeficitCalorico();
        $comidas = array_values(array_filter((array)($state['comidas'] ?? []), fn($comida) => ($comida['fecha'] ?? '') === $fecha));

        $totales = [
            'calorias' => 0,
            'proteinas' => 0,
            'carbohidratos' => 0,
            'grasas' => 0,
            'azucar' => 0,
        ];
        foreach ($comidas as $comida) {
            foreach ($totales as $campo => $valor) {
                $totales[$campo] = $valor + (int)($comida[$campo] ?? 0);
            }
        }

        $tdee = $this->calcularTdee((array)($state['datosUsuario'] ?? []));
        $objetivos = $tdee !== null ? $this->calcularObjetivosMacro($tdee, (string)($state['datosUsuario']['objetivoDeficit'] ?? 'moderado')) : null;

        return [
            'exito' => true,
            'fecha' => $fecha,
            'comidas' => count($comidas),
            'totales' => $totales,
            'tdee' => $tdee,
            'objetivos' => $objetivos,
            'calorias_restantes' => $objetivos ? ((int)$objetivos['calorias'] - $totales['calorias']) : null,
        ];
    }

    private function completarHabitoAyuno(int $userId, string $fecha): array
    {
        $repo = new HabitosRepository($userId);
        $habitos = $repo->getAll();
        $habitIndex = null;

        foreach ($habitos as $index => $habito) {
            if ($this->normalizarTexto((string)($habito['nombre'] ?? '')) === 'ayuno') {
                $habitIndex = $index;
                break;
            }
        }

        if ($habitIndex === null) {
            $maxId = empty($habitos) ? 0 : max(0, ...array_map(fn($h) => (int)($h['id'] ?? 0), $habitos));
            $habitos[] = [
                'id' => $maxId + 1,
                'nombre' => 'Ayuno',
                'importancia' => 'Media',
                'tags' => [],
                'frecuencia' => ['tipo' => 'diario'],
                'diasInactividad' => 0,
                'racha' => 0,
                'historialCompletados' => [],
                'fechaCreacion' => $fecha,
                'descripcion' => 'Hábito especial generado por el plugin de ayuno',
                'updatedAt' => $this->timestampMs(),
            ];
            $habitIndex = count($habitos) - 1;
        }

        $historial = (array)($habitos[$habitIndex]['historialCompletados'] ?? []);
        $nuevo = !in_array($fecha, $historial, true);
        if ($nuevo) {
            $historial[] = $fecha;
            $habitos[$habitIndex]['historialCompletados'] = $historial;
            $habitos[$habitIndex]['ultimoCompletado'] = $fecha;
            $habitos[$habitIndex]['racha'] = (int)($habitos[$habitIndex]['racha'] ?? 0) + 1;
        }
        $habitos[$habitIndex]['updatedAt'] = $this->timestampMs();

        $ok = $repo->saveAll([$habitos[$habitIndex]], true);
        return [
            'marcado' => $ok,
            'nuevo_completado' => $nuevo,
            'id' => (int)$habitos[$habitIndex]['id'],
            'fecha' => $fecha,
        ];
    }

    private function estimarNutricion(int $userId, string $descripcion): array
    {
        $llm = $this->resolverConfigLLM($userId);
        $resultado = (new LLMProviderService())->estimarNutricion($descripcion, $llm['proveedor'], $llm['modelo']);
        $resultado['fuente'] = 'ia';
        $resultado['logProceso'] = ['Backend IA: ' . $resultado['provider'] . ' / ' . $resultado['model']];
        return $resultado;
    }

    private function nutricionManual(string $descripcion, int $calorias, array $params): array
    {
        return [
            'descripcion' => ucfirst($descripcion),
            'calorias' => max(0, $calorias),
            'proteinas' => max(0, (int)($params['proteinas'] ?? 0)),
            'carbohidratos' => max(0, (int)($params['carbohidratos'] ?? 0)),
            'grasas' => max(0, (int)($params['grasas'] ?? 0)),
            'azucar' => max(0, (int)($params['azucar'] ?? 0)),
            'fuente' => 'manual',
            'logProceso' => ['Calorías indicadas manualmente por el usuario.'],
        ];
    }

    private function resolverConfigLLM(int $userId): array
    {
        return [
            'proveedor' => (string)(get_user_meta($userId, 'glory_chatbot_proveedor', true) ?: get_option('glory_chatbot_proveedor') ?: 'groq'),
            'modelo' => (string)(get_user_meta($userId, 'glory_chatbot_modelo', true) ?: get_option('glory_chatbot_modelo') ?: 'openai/gpt-oss-120b'),
        ];
    }

    private function parseTimestampMs(mixed $value, int $userId, string $canal): int
    {
        if ($value === null || $value === '') {
            return $this->timestampMs();
        }
        if (is_numeric($value)) {
            $numeric = (float)$value;
            return $numeric > 100000000000 ? (int)$numeric : (int)round($numeric * 1000);
        }

        try {
            $date = new \DateTimeImmutable((string)$value, UserTimeService::timezone($userId, $canal));
            return ((int)$date->format('U')) * 1000;
        } catch (\Throwable) {
            return $this->timestampMs();
        }
    }

    private function fechaLocal(int $timestampMs, int $userId, string $canal): string
    {
        $date = (new \DateTimeImmutable('@' . (int)floor($timestampMs / 1000)))->setTimezone(UserTimeService::timezone($userId, $canal));
        return $date->format('Y-m-d');
    }

    private function formatearMs(int $timestampMs, int $userId, string $canal): string
    {
        if ($timestampMs <= 0) {
            return '';
        }
        return (new \DateTimeImmutable('@' . (int)floor($timestampMs / 1000)))
            ->setTimezone(UserTimeService::timezone($userId, $canal))
            ->format(DATE_ATOM);
    }

    private function normalizarDuracionHoras(mixed $value): int
    {
        $horas = is_numeric($value) ? (int)$value : self::DEFAULT_FAST_HOURS;
        return min(72, max(1, $horas));
    }

    private function calcularTdee(array $datos): ?int
    {
        $peso = isset($datos['peso']) ? (float)$datos['peso'] : null;
        $altura = isset($datos['altura']) ? (float)$datos['altura'] : null;
        $edad = isset($datos['edad']) ? (float)$datos['edad'] : 30;
        $sexo = (string)($datos['sexo'] ?? 'masculino');
        $cintura = isset($datos['cintura']) ? (float)$datos['cintura'] : null;

        if ($peso && $altura) {
            $base = 10 * $peso + 6.25 * $altura - 5 * $edad;
            $tmb = $sexo === 'femenino' ? $base - 161 : $base + 5;
        } elseif ($cintura && $altura) {
            $ratio = $cintura / $altura;
            $alturaM = $altura / 100;
            $pesoEstimado = ($ratio * 50) * $alturaM * $alturaM;
            $base = 10 * $pesoEstimado + 6.25 * $altura - 5 * 30;
            $tmb = $sexo === 'femenino' ? $base - 161 : $base + 5;
        } else {
            return null;
        }

        $sesiones = (float)($datos['ejercicioSesiones'] ?? 0);
        $minutos = (float)($datos['ejercicioMinutos'] ?? 30);
        $minutosTotal = $sesiones * $minutos;
        $factor = $sesiones <= 0 ? 1.2 : ($minutosTotal < 90 ? 1.375 : ($minutosTotal < 270 ? 1.55 : ($minutosTotal < 450 ? 1.725 : 1.9)));
        return (int)round($tmb * $factor);
    }

    private function calcularObjetivosMacro(int $tdee, string $objetivo): array
    {
        $deficit = match ($objetivo) {
            'bajo' => 250,
            'alto' => 750,
            'peligroso' => 1000,
            default => 500,
        };
        $calorias = max($tdee - $deficit, 1200);
        return [
            'calorias' => $calorias,
            'proteinas' => (int)round(($calorias * 0.3) / 4),
            'carbohidratos' => (int)round(($calorias * 0.4) / 4),
            'grasas' => (int)round(($calorias * 0.3) / 9),
            'azucar' => (int)round(($calorias * 0.1) / 4),
            'deficitDiario' => $deficit,
        ];
    }

    private function formatearDuracion(int $ms): string
    {
        $minutosTotales = max(0, (int)floor($ms / 60000));
        $horas = (int)floor($minutosTotales / 60);
        $minutos = $minutosTotales % 60;
        return $horas > 0 ? "{$horas}h {$minutos}m" : "{$minutos}m";
    }

    private function normalizarTexto(string $texto): string
    {
        $texto = mb_strtolower(trim($texto));
        $texto = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto) ?: $texto;
        return preg_replace('/[^a-z0-9]+/', '', $texto) ?: '';
    }

    private function timestampMs(): int
    {
        return (int)floor(microtime(true) * 1000);
    }

    private function generarId(string $prefix): string
    {
        return $prefix . '_' . $this->timestampMs() . '_' . substr(wp_generate_uuid4(), 0, 8);
    }
}
