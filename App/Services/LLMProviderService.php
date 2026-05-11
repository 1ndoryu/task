<?php

/**
 * Servicio LLM OpenAI-compatible para Groq y DeepSeek.
 *
 * @package App\Services
 */

namespace App\Services;

class LLMProviderService
{
    private const PROVIDERS = [
        'groq' => [
            'url' => 'https://api.groq.com/openai/v1/chat/completions',
            'env' => ['GROQ_API', 'GROQ_API_1', 'GROQ_API_2', 'GROQ_API_3'],
            'models' => [
                'openai/gpt-oss-120b',
                'moonshotai/kimi-k2-instruct-0905',
                'meta-llama/llama-4-maverick-17b-128e-instruct',
                'qwen/qwen3-32b',
                'llama-3.3-70b-versatile',
                'meta-llama/llama-4-scout-17b-16e-instruct',
                'moonshotai/kimi-k2-instruct',
                'openai/gpt-oss-20b',
            ],
        ],
        'deepseek' => [
            'url' => 'https://api.deepseek.com/chat/completions',
            'env' => ['DEEPSEEK_API', 'DEEPSEEK-API', 'DEEPSEEK_API_KEY'],
            'models' => ['deepseek-chat', 'deepseek-reasoner'],
        ],
    ];

    private const PROMPT_NUTRICION = 'You are a certified nutritionist estimating macros for a home-cooked Latin American diet.
Rules:
- Use USDA FoodData Central values. For Venezuelan/Latin foods use accurate regional data.
- Assume food is COOKED unless explicitly stated raw. This is critical for rice, pasta, grains.
- If fried, account for absorbed oil. If with skin, include it.
- Be conservative: use home-portion sizes, not restaurant.
- Never fabricate values. Use the closest known food if exact data is unavailable.
Respond ONLY with valid JSON, no markdown, no explanation.
JSON format: {"calorias":<kcal>,"proteinas":<g>,"carbohidratos":<g>,"grasas":<g>,"azucar":<g>}';

    public function enviarChat(array $messages, string $provider, string $model, array $options = []): array
    {
        $provider = $this->normalizarProvider($provider);
        $model = $this->validarModelo($provider, $model);
        $messages = $this->validarMensajes($messages);
        $keys = $this->obtenerKeysProvider($provider);

        if (empty($keys)) {
            throw new \RuntimeException("No hay API key configurada para {$provider} en el entorno.");
        }

        $ultimoError = null;
        foreach ($keys as $key) {
            try {
                return $this->ejecutarRequest($provider, $key, $model, $messages, $options);
            } catch (\Throwable $e) {
                $ultimoError = $e;
                error_log('[LLMProviderService] Fallo provider=' . $provider . ' model=' . $model . ': ' . $e->getMessage());
            }
        }

        throw new \RuntimeException($ultimoError ? $ultimoError->getMessage() : 'No se pudo contactar el proveedor IA.');
    }

    public function estimarNutricion(string $descripcion, string $provider, string $model): array
    {
        $descripcion = trim(wp_strip_all_tags($descripcion));
        if ($descripcion === '' || strlen($descripcion) > 1200) {
            throw new \InvalidArgumentException('Descripción de comida inválida.');
        }

        $respuesta = $this->enviarChat([
            ['role' => 'system', 'content' => self::PROMPT_NUTRICION],
            ['role' => 'user', 'content' => $descripcion],
        ], $provider, $model, ['temperature' => 0.1, 'maxTokens' => 180]);

        $contenido = trim((string)($respuesta['contenido'] ?? ''));
        $json = preg_replace('/^```[a-z]*\s*/i', '', $contenido);
        $json = preg_replace('/\s*```$/', '', $json ?? '');
        $datos = json_decode(trim((string)$json), true);

        if (!is_array($datos) || !isset($datos['calorias']) || !is_numeric($datos['calorias'])) {
            throw new \RuntimeException('La IA no devolvió macros válidos. Reintenta con una descripción más concreta.');
        }

        return [
            'calorias' => (int)round((float)($datos['calorias'] ?? 0)),
            'proteinas' => (int)round((float)($datos['proteinas'] ?? 0)),
            'carbohidratos' => (int)round((float)($datos['carbohidratos'] ?? 0)),
            'grasas' => (int)round((float)($datos['grasas'] ?? 0)),
            'azucar' => (int)round((float)($datos['azucar'] ?? 0)),
            'descripcion' => ucfirst($descripcion),
            'provider' => $respuesta['provider'],
            'model' => $respuesta['model'],
        ];
    }

    private function ejecutarRequest(string $provider, string $apiKey, string $model, array $messages, array $options): array
    {
        $config = self::PROVIDERS[$provider];
        $maxTokens = (int)($options['maxTokens'] ?? 2048);
        $temperature = (float)($options['temperature'] ?? 0.7);
        $body = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => $temperature,
        ];

        if ($provider === 'groq') {
            $body['max_completion_tokens'] = $maxTokens;
        } else {
            $body['max_tokens'] = $maxTokens;
        }

        $response = wp_remote_post($config['url'], [
            'timeout' => 45,
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $apiKey,
            ],
            'body' => wp_json_encode($body),
        ]);

        if (is_wp_error($response)) {
            throw new \RuntimeException($response->get_error_message());
        }

        $status = (int)wp_remote_retrieve_response_code($response);
        $raw = (string)wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);

        if ($status < 200 || $status >= 300) {
            $error = is_array($data) ? ($data['error'] ?? null) : null;
            $mensaje = is_array($error) ? ($error['message'] ?? 'Error del proveedor') : (is_array($data) ? ($data['message'] ?? $error ?? 'Error del proveedor') : 'Error del proveedor');
            throw new \RuntimeException("{$provider} {$status}: {$mensaje}");
        }

        $contenido = $data['choices'][0]['message']['content'] ?? '';
        if (!is_string($contenido) || trim($contenido) === '') {
            throw new \RuntimeException('Respuesta vacía del modelo.');
        }

        return [
            'contenido' => $contenido,
            'tokensPrompt' => (int)($data['usage']['prompt_tokens'] ?? 0),
            'tokensComplecion' => (int)($data['usage']['completion_tokens'] ?? 0),
            'provider' => $provider,
            'model' => $model,
        ];
    }

    private function normalizarProvider(string $provider): string
    {
        $provider = strtolower(trim($provider));
        if (!isset(self::PROVIDERS[$provider])) {
            throw new \InvalidArgumentException('Proveedor IA no soportado.');
        }
        return $provider;
    }

    private function validarModelo(string $provider, string $model): string
    {
        $model = trim($model);
        if (!in_array($model, self::PROVIDERS[$provider]['models'], true)) {
            throw new \InvalidArgumentException('Modelo IA no permitido para este proveedor.');
        }
        return $model;
    }

    private function validarMensajes(array $messages): array
    {
        $validos = [];
        foreach (array_slice($messages, -25) as $message) {
            $role = $message['role'] ?? '';
            $content = $message['content'] ?? '';
            if (!in_array($role, ['system', 'user', 'assistant'], true) || !is_string($content) || trim($content) === '') {
                continue;
            }
            $validos[] = ['role' => $role, 'content' => substr($content, 0, 12000)];
        }

        if (empty($validos)) {
            throw new \InvalidArgumentException('No hay mensajes válidos para enviar a la IA.');
        }

        return $validos;
    }

    private function obtenerKeysProvider(string $provider): array
    {
        $keys = [];
        foreach (self::PROVIDERS[$provider]['env'] as $envName) {
            $value = $this->leerEnv($envName);
            if ($value !== '') {
                $keys[] = $value;
            }
        }
        return array_values(array_unique($keys));
    }

    private function leerEnv(string $name): string
    {
        return EnvService::get($name);
    }
}