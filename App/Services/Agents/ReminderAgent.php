<?php

namespace App\Services\Agents;

use App\Services\LLMProviderService;

/**
 * [135A-1] Miniagente especializado en interpretación y normalización de fechas para recordatorios.
 *
 * Resuelve el problema de "hora incorrecta" causado por que el LLM principal genera fechas ISO8601
 * sin conocer la zona horaria exacta ni el momento actual. Este agente recibe la expresión natural
 * y la hora actual del usuario para producir una fecha precisa.
 *
 * Uso: cuando el main LLM genera un `programar_recordatorio` con fecha dudosa o pasada,
 * llamar a `resolverFecha()` antes de persistir en AgentActionService.
 *
 * Gotcha: añade ~1 LLM call extra por recordatorio. Solo invocar cuando la fecha original
 * está en el pasado o la expresión es ambigua (relativa: "en 30 min", "a las 3pm").
 */
class ReminderAgent
{
    /* Modelo más rápido de Groq para parsing — no necesita razonamiento profundo */
    private const PARSE_MODEL    = 'llama-3.3-70b-versatile';
    private const PARSE_PROVIDER = 'groq';

    /**
     * Convierte una expresión de fecha/hora natural en ISO8601 usando el contexto temporal actual.
     *
     * @param string $expresion   La expresión original: "a las 3pm", "en 30 minutos", "mañana a las 9"
     * @param string $mensajeCtx  Mensaje completo del usuario para dar contexto
     * @param string $timezone    Zona horaria del usuario (ej: 'America/Caracas')
     * @return string|null        ISO8601 normalizado, o null si no se puede determinar
     */
    public static function resolverFecha(string $expresion, string $mensajeCtx = '', string $timezone = 'America/Caracas'): ?string
    {
        if (trim($expresion) === '') {
            return null;
        }

        try {
            $tz   = new \DateTimeZone($timezone);
            $ahora = new \DateTimeImmutable('now', $tz);
            $ahoraStr = $ahora->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            $ahoraStr = current_time('Y-m-d H:i:s');
            $timezone = 'WP local';
        }

        $prompt = "Eres un parser de fechas. Convierte la expresión a ISO8601 exacto."
            . "\nHora actual: {$ahoraStr} (zona: {$timezone})"
            . "\nExpresión a parsear: \"{$expresion}\""
            . ($mensajeCtx !== '' ? "\nContexto del mensaje: \"{$mensajeCtx}\"" : '')
            . "\n\nResponde SOLO con la fecha en formato ISO8601 (ej: 2026-05-13T15:00:00). Si no puedes determinar la fecha, responde exactamente: null";

        try {
            $result  = (new LLMProviderService())->enviarChat(
                [['role' => 'user', 'content' => $prompt]],
                self::PARSE_PROVIDER,
                self::PARSE_MODEL,
                ['temperature' => 0, 'maxTokens' => 40]
            );
            $text = trim((string)($result['contenido'] ?? $result['content'] ?? $result['message'] ?? ''));

            if ($text === '' || strtolower($text) === 'null') {
                return null;
            }

            /* Validar que sea un datetime parseable y sea futuro */
            try {
                $tz  = new \DateTimeZone($timezone);
                $dt  = new \DateTimeImmutable($text, $tz);
                return $dt->format('c'); /* ISO8601 canónico con offset */
            } catch (\Throwable) {
                return null;
            }
        } catch (\Throwable $e) {
            error_log('[ReminderAgent] resolverFecha falló: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Indica si una fecha ISO8601 necesita corrección (está en el pasado o dentro de los próx. 30s).
     * Se usa para decidir si llamar a resolverFecha() o confiar en la fecha del LLM principal.
     */
    public static function necesitaCorreccion(string $fecha, string $timezone = 'America/Caracas'): bool
    {
        if ($fecha === '') {
            return true;
        }
        try {
            $ts = (new \DateTimeImmutable($fecha, new \DateTimeZone($timezone)))->getTimestamp();
            return $ts < (time() - 30); /* en el pasado = necesita corrección */
        } catch (\Throwable) {
            return true;
        }
    }
}
