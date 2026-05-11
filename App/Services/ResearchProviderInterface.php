<?php

namespace App\Services;

interface ResearchProviderInterface
{
    public function search(int $userId, string $query, int $limit = 10): array;
}
