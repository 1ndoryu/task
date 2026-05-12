<?php

namespace App\Services\Agents;

use App\Services\LLMProviderService;

/**
 * [135A-1] Miniagente planificador para solicitudes complejas multi-paso.
 *
 * Convierte una solicitud ambigua o compleja del usuario en pasos verificables.
 * Decide si una tarea requiere OpenCode o se puede resolver con acciones del agente.
 *
 * Casos de uso:
 * - "Organiza mis tareas y crea un plan para la semana"
 * - "Necesito hacer X, Y y Z para el proyecto, ¿por dónde empezamos?"
 * - Solicitudes donde el usuario no sabe qué acción necesita
 *
 * Gotcha: el PlannerAgent produce pasos descriptivos, NO emite acciones directas.
 * El resultado se usa para enriquecer el contexto del main LLM o mostrar al usuario.
 * No llamar para solicitudes simples — solo cuando la complejidad lo justifica.
 */
class PlannerAgent
{
    /* Modelo con mejor razonamiento para descomponer tareas complejas */
    private const PLAN_MODEL    = 'openai/gpt-oss-120b';
    private const PLAN_PROVIDER = 'groq';
    private const MAX_TOKENS    = 500;

    /**
     * Descompone una solicitud compleja en pasos verificables.
     * Retorna array de pasos en texto, o [] si no es necesario o falla.
     *
     * @param string $solicitud Mensaje completo del usuario
     * @param string $contexto  Contexto relevante (tareas actuales, etc.)
     * @return array{pasos: string[], requiere_opencode: bool, resumen: string}
     */
    public static function descomponer(string $solicitud, string $contexto = ''): array
    {
        if (trim($solicitud) === '') {
            return ['pasos' => [], 'requiere_opencode' => false, 'resumen' => ''];
        }

        $instruccion = "Eres un asistente de planificación. Analiza la solicitud del usuario y descompónla en pasos concretos y verificables. Responde en JSON: {\"pasos\": [\"paso 1\", \"paso 2\"], \"requiere_opencode\": false, \"resumen\": \"descripción breve\"}. requiere_opencode=true solo si la solicitud implica cambios de código, commits o deploys.";

        $contenido = "Solicitud: {$solicitud}";
        if ($contexto !== '') {
            $contenido .= "\n\nContexto actual:\n{$contexto}";
        }

        try {
            $result = (new LLMProviderService())->enviarChat(
                [
                    ['role' => 'system', 'content' => $instruccion],
                    ['role' => 'user',   'content' => $contenido],
                ],
                self::PLAN_PROVIDER,
                self::PLAN_MODEL,
                ['temperature' => 0.3, 'maxTokens' => self::MAX_TOKENS]
            );
            $text = trim((string)($result['contenido'] ?? $result['content'] ?? $result['message'] ?? ''));

            /* Extraer JSON de la respuesta */
            $pos = strpos($text, '{');
            if ($pos !== false) {
                $data = json_decode(substr($text, $pos), true);
                if (is_array($data)) {
                    return [
                        'pasos'            => (array)($data['pasos'] ?? []),
                        'requiere_opencode' => (bool)($data['requiere_opencode'] ?? false),
                        'resumen'          => (string)($data['resumen'] ?? ''),
                    ];
                }
            }
            return ['pasos' => [], 'requiere_opencode' => false, 'resumen' => $text];
        } catch (\Throwable $e) {
            error_log('[PlannerAgent] descomponer falló: ' . $e->getMessage());
            return ['pasos' => [], 'requiere_opencode' => false, 'resumen' => ''];
        }
    }

    /**
     * Heurística rápida: ¿esta solicitud amerita descomposición?
     * Evita la llamada extra al LLM para solicitudes simples.
     */
    public static function esSolicitudCompleja(string $mensaje): bool
    {
        $n = mb_strtolower($mensaje);
        /* Más de 2 cosas pedidas, verbos de planificación, o explícitamente multi-paso */
        $indicadores = ['/y además/u', '/también necesito/u', '/varias cosas/u', '/organiza/u', '/planifica/u', '/plan para/u', '/por dónde empiezo/u', '/qué pasos/u'];
        foreach ($indicadores as $patron) {
            if (preg_match($patron, $n)) {
                return true;
            }
        }
        /* Más de 3 verbos de acción sugieren multi-tarea */
        $verbos = preg_match_all('/\b(crea|crea[r]?|agrega|añade|edita|completa|borra|programa|recuerda|actualiza|manda|envía)\b/u', $n, $m);
        return $verbos > 2;
    }
}
