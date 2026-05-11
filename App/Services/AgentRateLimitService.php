<?php

namespace App\Services;

class AgentRateLimitService
{
    public function assertAllowed(int $userId, string $scope, int $limit, int $windowSeconds): void
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('Usuario inválido para rate limit del agente.');
        }

        $scope = preg_replace('/[^a-z0-9_\-]/i', '_', $scope) ?: 'default';
        $key = 'glory_agent_rate_' . md5($userId . ':' . $scope);
        $bucket = get_transient($key);
        $now = time();

        if (!is_array($bucket) || (int)($bucket['resetAt'] ?? 0) <= $now) {
            $bucket = ['count' => 0, 'resetAt' => $now + $windowSeconds];
        }

        if ((int)$bucket['count'] >= $limit) {
            $retry = max(1, (int)$bucket['resetAt'] - $now);
            throw new \RuntimeException("Límite del agente alcanzado. Reintenta en {$retry} segundos.");
        }

        $bucket['count'] = (int)$bucket['count'] + 1;
        set_transient($key, $bucket, $windowSeconds);
    }
}
