<?php

namespace App\Services\Agents;

use App\Services\LLMProviderService;

/**
 * [135A-1] Miniagente especializado en compresión de contexto conversacional.
 *
 * Envuelve la lógica de compactación de historial con una interfaz más limpia.
 * Usado internamente por AgentChatProcessor::compactarHistorialSiNecesario() y
 * disponible como utilidad independiente para comprimir bloques de texto arbitrarios.
 *
 * Gotcha: el método resumirBloque() es stateless y no accede a la BD — solo llama al LLM.
 * La persistencia es responsabilidad del llamador (AgentChatProcessor).
 */
class ContextAgent
{
    /* Modelo más inteligente disponible para resúmenes coherentes */
    private const SUMMARY_MODEL    = 'moonshotai/kimi-k2-instruct-0905';
    private const SUMMARY_PROVIDER = 'groq';
    private const MAX_TOKENS       = 400;
    private const TEMPERATURE      = 0.2;

    /**
     * Resume un bloque de conversación en 3-5 oraciones.
     * Incluye decisiones tomadas, datos personales y tareas creadas.
     *
     * @param string $bloque  Texto de conversación (U: / A: prefixed lines)
     * @param string $enfoque Hint adicional sobre qué preservar (opcional)
     * @return string         Resumen compacto, o '' si falla
     */
    public static function resumirBloque(string $bloque, string $enfoque = ''): string
    {
        if (trim($bloque) === '') {
            return '';
        }

        $instruccion = 'Resume en 3-5 oraciones los puntos clave de esta conversación, en tercera persona, para ser usados como contexto futuro. Incluye: decisiones tomadas, datos personales mencionados, tareas creadas. Sé conciso.';
        if ($enfoque !== '') {
            $instruccion .= " Prioriza: {$enfoque}.";
        }

        try {
            $result = (new LLMProviderService())->enviarChat(
                [
                    ['role' => 'system', 'content' => $instruccion],
                    ['role' => 'user',   'content' => $bloque],
                ],
                self::SUMMARY_PROVIDER,
                self::SUMMARY_MODEL,
                ['temperature' => self::TEMPERATURE, 'maxTokens' => self::MAX_TOKENS]
            );
            return trim((string)($result['contenido'] ?? $result['content'] ?? $result['message'] ?? ''));
        } catch (\Throwable $e) {
            error_log('[ContextAgent] resumirBloque falló: ' . $e->getMessage());
            return '';
        }
    }

    /**
     * Comprime un contexto maestro largo a un máximo de $maxChars caracteres.
     * Preserva datos personales, instrucciones permanentes y preferencias.
     *
     * @param string $contexto Texto del contexto maestro actual
     * @param int    $maxChars Límite de caracteres del resultado (~500-2000)
     * @return string          Contexto comprimido, o el original si falla
     */
    public static function comprimirContextoMaestro(string $contexto, int $maxChars = 2000): string
    {
        if (mb_strlen($contexto) <= $maxChars) {
            return $contexto;
        }

        $instruccion = "Resume el siguiente contexto personal del usuario en máximo {$maxChars} caracteres, conservando todos los datos importantes: preferencias, instrucciones permanentes, datos personales, metas. Sé conciso pero completo.";

        try {
            $result = (new LLMProviderService())->enviarChat(
                [
                    ['role' => 'system', 'content' => $instruccion],
                    ['role' => 'user',   'content' => $contexto],
                ],
                self::SUMMARY_PROVIDER,
                self::SUMMARY_MODEL,
                ['temperature' => 0.1, 'maxTokens' => (int)ceil($maxChars / 3)]
            );
            $resumen = trim((string)($result['contenido'] ?? $result['content'] ?? $result['message'] ?? ''));
            return $resumen !== '' ? $resumen : $contexto;
        } catch (\Throwable $e) {
            error_log('[ContextAgent] comprimirContextoMaestro falló: ' . $e->getMessage());
            return $contexto;
        }
    }
}
