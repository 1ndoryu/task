<?php

namespace App\Services;

/**
 * [125B-1] Semáforo global de requests al LLM.
 *
 * Máximo N requests concurrentes al proveedor LLM usando MySQL GET_LOCK.
 * Cada slot es un lock MySQL independiente; el slot inicial se elige
 * aleatoriamente para evitar lock starvation (que el slot 0 siempre
 * sea el primero en probarse).
 *
 * ORDEN OBLIGATORIO DE LOCKS (prevención de deadlock):
 *   Adquirir: 1) Per-user lock (GET_LOCK), 2) Global LLM slot
 *   Liberar:  1) Global LLM slot, 2) Per-user lock
 *
 * @package App\Services
 */
class GlobalLLMRateLimiter
{
    private int $maxConcurrent;
    private string $lockPrefix;
    private \wpdb $wpdb;

    /**
     * @param \wpdb  $wpdb          Instancia de wpdb
     * @param int    $maxConcurrent Número máximo de slots (default 5)
     * @param string $lockPrefix    Prefijo para los locks MySQL
     */
    public function __construct(
        \wpdb $wpdb,
        int $maxConcurrent = 5,
        string $lockPrefix = 'glory_llm_sem_'
    ) {
        $this->wpdb = $wpdb;
        $this->maxConcurrent = max(1, $maxConcurrent);
        $this->lockPrefix = $lockPrefix;
    }

    /**
     * Adquiere un slot LLM si hay disponible.
     *
     * El slot inicial se elige aleatoriamente para evitar que el slot 0
     * siempre se pruebe primero (lock starvation).
     *
     * @return int|false Número de slot adquirido, o false si todos ocupados.
     */
    public function acquireSlot(): int|false
    {
        $start = random_int(0, $this->maxConcurrent - 1);

        for ($i = 0; $i < $this->maxConcurrent; $i++) {
            $slot = ($start + $i) % $this->maxConcurrent;

            $locked = $this->wpdb->get_var(
                $this->wpdb->prepare(
                    "SELECT GET_LOCK(%s, 0)",
                    $this->lockPrefix . $slot
                )
            );

            /* GET_LOCK retorna 1 como string en MySQL (o 1 como int según el driver) */
            if ($locked === '1' || $locked === 1) {
                return $slot;
            }
        }

        return false;
    }

    /**
     * Libera un slot LLM.
     *
     * @param int $slot Número de slot a liberar.
     */
    public function releaseSlot(int $slot): void
    {
        $this->wpdb->query(
            $this->wpdb->prepare(
                "SELECT RELEASE_LOCK(%s)",
                $this->lockPrefix . $slot
            )
        );
    }

    /**
     * Obtiene el máximo de concurrentes (útil para logs).
     */
    public function getMaxConcurrent(): int
    {
        return $this->maxConcurrent;
    }
}
