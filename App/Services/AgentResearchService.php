<?php

namespace App\Services;

class AgentResearchService
{
    private ResearchProviderInterface $provider;

    public function __construct(?ResearchProviderInterface $provider = null)
    {
        $this->provider = $provider ?? new LocalResearchProvider();
    }

    public function buscar(int $userId, string $query, int $limit = 10): array
    {
        (new AgentRateLimitService())->assertAllowed($userId, 'research_local', 30, HOUR_IN_SECONDS);
        return $this->provider->search($userId, $query, $limit);
    }
}
