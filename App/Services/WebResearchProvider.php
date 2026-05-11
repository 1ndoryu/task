<?php

namespace App\Services;

/* [107A] Proveedor de búsqueda web: Tavily como primario, Serper como fallback en 429.
 * Ambas claves viven en env; si ninguna está configurada lanza InvalidArgumentException.
 * Gotcha: wp_remote_post en WP no arroja excepciones, hay que revisar is_wp_error y código HTTP. */
class WebResearchProvider implements ResearchProviderInterface
{
    private const TAVILY_URL = 'https://api.tavily.com/search';
    private const SERPER_URL = 'https://google.serper.dev/search';
    private const TIMEOUT    = 10;

    public function search(int $userId, string $query, int $limit = 10): array
    {
        $query = trim(wp_strip_all_tags($query));
        if ($query === '' || strlen($query) > 500) {
            throw new \InvalidArgumentException('Consulta de búsqueda web inválida.');
        }
        $limit = max(1, min(10, $limit));

        $tavilyKey = defined('TAVILY_API_KEY') ? TAVILY_API_KEY : (getenv('TAVILY_API_KEY') ?: '');
        $serperKey = defined('SERPER_API_KEY') ? SERPER_API_KEY : (getenv('SERPER_API_KEY') ?: '');

        if ($tavilyKey !== '') {
            $result = $this->buscarTavily($query, $limit, $tavilyKey);
            /* Fallback a Serper solo en rate-limit (429) */
            if ($result !== null) {
                return $result;
            }
        }

        if ($serperKey !== '') {
            return $this->buscarSerper($query, $limit, $serperKey);
        }

        throw new \InvalidArgumentException('Búsqueda web no configurada: define TAVILY_API_KEY o SERPER_API_KEY.');
    }

    /* Retorna null si Tavily devuelve 429 (para activar fallback). Lanza excepción en otros errores. */
    private function buscarTavily(string $query, int $limit, string $apiKey): ?array
    {
        $response = wp_remote_post(self::TAVILY_URL, [
            'timeout' => self::TIMEOUT,
            'headers' => ['Content-Type' => 'application/json'],
            'body'    => wp_json_encode([
                'api_key'      => $apiKey,
                'query'        => $query,
                'max_results'  => $limit,
                'search_depth' => 'basic',
            ]),
        ]);

        if (is_wp_error($response)) {
            throw new \RuntimeException('Error contactando Tavily: ' . $response->get_error_message());
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code === 429) {
            return null; /* Activar fallback */
        }
        if ($code < 200 || $code >= 300) {
            throw new \RuntimeException("Tavily devolvió HTTP {$code}.");
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Respuesta JSON invalida de Tavily: ' . json_last_error_msg());
        }
        $results = array_map(fn(array $item): array => [
            'tipo'    => 'web',
            'titulo'  => (string)($item['title'] ?? ''),
            'url'     => (string)($item['url'] ?? ''),
            'resumen' => (string)($item['content'] ?? ''),
            'score'   => (float)($item['score'] ?? 0.0),
        ], (array)($body['results'] ?? []));

        return [
            'provider' => 'tavily',
            'query'    => $query,
            'results'  => $results,
        ];
    }

    private function buscarSerper(string $query, int $limit, string $apiKey): array
    {
        $response = wp_remote_post(self::SERPER_URL, [
            'timeout' => self::TIMEOUT,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-KEY'    => $apiKey,
            ],
            'body' => wp_json_encode(['q' => $query, 'num' => $limit]),
        ]);

        if (is_wp_error($response)) {
            throw new \RuntimeException('Error contactando Serper: ' . $response->get_error_message());
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code < 200 || $code >= 300) {
            throw new \RuntimeException("Serper devolvió HTTP {$code}.");
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Respuesta JSON invalida de Serper: ' . json_last_error_msg());
        }
        $organic = (array)($body['organic'] ?? []);
        $results = array_map(fn(array $item): array => [
            'tipo'    => 'web',
            'titulo'  => (string)($item['title'] ?? ''),
            'url'     => (string)($item['link'] ?? ''),
            'resumen' => (string)($item['snippet'] ?? ''),
            'score'   => 0.7,
        ], $organic);

        return [
            'provider' => 'serper',
            'query'    => $query,
            'results'  => $results,
        ];
    }
}
