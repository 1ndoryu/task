<?php

namespace App\Services;

/* [107A] Soporte para tipo 'local' (notas/tareas/hábitos) y 'web' (Tavily+Serper).
 * El tipo se elige por el parámetro $type; por defecto 'local' para retrocompatibilidad. */
class AgentResearchService
{
    private ResearchProviderInterface $provider;

    public function __construct(?ResearchProviderInterface $provider = null, string $type = 'local')
    {
        if ($provider !== null) {
            $this->provider = $provider;
        } elseif ($type === 'web') {
            $this->provider = new WebResearchProvider();
        } else {
            $this->provider = new LocalResearchProvider();
        }
    }

    public function buscar(int $userId, string $query, int $limit = 10, string $type = 'local'): array
    {
        $bucket = $type === 'web' ? 'research_web' : 'research_local';
        /* Web: 20 req/hora (APIs de pago). Local: 30 req/hora. */
        $max    = $type === 'web' ? 20 : 30;
        (new AgentRateLimitService())->assertAllowed($userId, $bucket, $max, HOUR_IN_SECONDS);
        return $this->provider->search($userId, $query, $limit);
    }
}
