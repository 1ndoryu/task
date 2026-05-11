<?php

/**
 * Servicio para Magnific Image Upscaler.
 *
 * @package App\Services
 */

namespace App\Services;

class MagnificService
{
    private const ENDPOINTS = [
        'creative' => 'https://api.magnific.com/v1/ai/image-upscaler',
        'precision' => 'https://api.magnific.com/v1/ai/image-upscaler-precision',
    ];

    private const CAMPOS_PERMITIDOS = [
        'creative' => [
            'scale_factor', 'optimized_for', 'prompt', 'creativity', 'hdr', 'resemblance',
            'fractality', 'engine', 'filter_nsfw', 'webhook_url',
        ],
        'precision' => [
            'sharpen', 'smart_grain', 'ultra_detail', 'filter_nsfw', 'webhook_url',
        ],
    ];

    public function iniciarEscalado(array $payload): array
    {
        $modo = $this->normalizarModo((string)($payload['mode'] ?? 'creative'));
        $image = $this->normalizarImagen((string)($payload['image'] ?? ''));
        $body = ['image' => $image];

        foreach (self::CAMPOS_PERMITIDOS[$modo] as $campo) {
            if (!array_key_exists($campo, $payload) || $payload[$campo] === '' || $payload[$campo] === null) {
                continue;
            }
            $body[$campo] = $this->normalizarValor($campo, $payload[$campo]);
        }

        return $this->request('POST', self::ENDPOINTS[$modo], $body);
    }

    public function obtenerEstado(string $taskId, string $modo): array
    {
        $modo = $this->normalizarModo($modo);
        $taskId = sanitize_text_field($taskId);
        if ($taskId === '') {
            throw new \InvalidArgumentException('Task ID requerido.');
        }

        return $this->request('GET', trailingslashit(self::ENDPOINTS[$modo]) . rawurlencode($taskId));
    }

    private function request(string $method, string $url, ?array $body = null): array
    {
        $apiKey = $this->obtenerApiKey();
        $args = [
            'timeout' => 60,
            'headers' => [
                'Content-Type' => 'application/json',
                'x-magnific-api-key' => $apiKey,
            ],
        ];

        if ($method === 'POST') {
            $args['body'] = wp_json_encode($body ?? []);
            $response = wp_remote_post($url, $args);
        } else {
            $response = wp_remote_get($url, $args);
        }

        if (is_wp_error($response)) {
            throw new \RuntimeException($response->get_error_message());
        }

        $status = (int)wp_remote_retrieve_response_code($response);
        $raw = (string)wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);

        if ($status < 200 || $status >= 300) {
            $error = is_array($data) ? ($data['error'] ?? null) : null;
            $message = is_array($error) ? ($error['message'] ?? 'Error de Magnific') : (is_array($data) ? ($data['message'] ?? $error ?? 'Error de Magnific') : 'Error de Magnific');
            throw new \RuntimeException("Magnific {$status}: {$message}");
        }

        return is_array($data) ? $data : ['raw' => $raw];
    }

    private function normalizarModo(string $modo): string
    {
        $modo = strtolower(trim($modo));
        if (!isset(self::ENDPOINTS[$modo])) {
            throw new \InvalidArgumentException('Modo de escalado inválido.');
        }
        return $modo;
    }

    private function normalizarImagen(string $image): string
    {
        $image = trim($image);
        if (str_starts_with($image, 'data:image/')) {
            $parts = explode(',', $image, 2);
            $image = $parts[1] ?? '';
        }
        if ($image === '' || strlen($image) > 25 * 1024 * 1024 || !preg_match('/^[A-Za-z0-9+\/]+=*$/', $image)) {
            throw new \InvalidArgumentException('Imagen base64 inválida o demasiado grande.');
        }
        return $image;
    }

    private function normalizarValor(string $campo, mixed $valor): mixed
    {
        return match ($campo) {
            'creativity', 'hdr', 'resemblance', 'fractality' => max(-10, min(10, (int)$valor)),
            'sharpen', 'smart_grain', 'ultra_detail' => max(0, min(100, (int)$valor)),
            'filter_nsfw' => (bool)$valor,
            'webhook_url' => esc_url_raw((string)$valor),
            default => sanitize_text_field((string)$valor),
        };
    }

    private function obtenerApiKey(): string
    {
        foreach (['MAGNIFIC_API_KEY', 'x-magnific-api-key', 'MAGNIFIC_API', 'MAGNIFIC_KEY'] as $name) {
            $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        throw new \RuntimeException('MAGNIFIC_API_KEY no está configurada en el entorno.');
    }
}