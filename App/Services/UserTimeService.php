<?php

namespace App\Services;

class UserTimeService
{
    public const META_USER_TIMEZONE = 'glory_user_timezone';
    public const META_WHATSAPP_TIMEZONE = 'glory_whatsapp_timezone';

    public static function syncFromClient(int $userId, mixed $timezone, string $source = 'client'): ?string
    {
        if ($userId <= 0) {
            return null;
        }

        $normalized = self::normalizeTimezone($timezone);
        if ($normalized === null) {
            return null;
        }

        update_user_meta($userId, self::META_USER_TIMEZONE, $normalized);
        if ($source === 'whatsapp') {
            update_user_meta($userId, self::META_WHATSAPP_TIMEZONE, $normalized);
        }

        return $normalized;
    }

    public static function resolveTimezoneName(int $userId = 0, string $channel = 'app', mixed $explicit = null): string
    {
        $explicitTz = self::normalizeTimezone($explicit);
        if ($explicitTz !== null) {
            return $explicitTz;
        }

        if ($userId > 0) {
            if ($channel === 'whatsapp') {
                $whatsapp = self::normalizeTimezone(get_user_meta($userId, self::META_WHATSAPP_TIMEZONE, true));
                if ($whatsapp !== null) {
                    return $whatsapp;
                }
            }

            $user = self::normalizeTimezone(get_user_meta($userId, self::META_USER_TIMEZONE, true));
            if ($user !== null) {
                return $user;
            }

            if ($channel === 'whatsapp') {
                $inferred = self::inferWhatsappTimezone($userId);
                if ($inferred !== null) {
                    return $inferred;
                }
            }
        }

        return self::wordpressTimezoneName();
    }

    public static function timezone(int $userId = 0, string $channel = 'app', mixed $explicit = null): \DateTimeZone
    {
        try {
            return new \DateTimeZone(self::resolveTimezoneName($userId, $channel, $explicit));
        } catch (\Throwable) {
            return self::wordpressTimezone();
        }
    }

    public static function today(int $userId = 0, string $channel = 'app', mixed $explicit = null): string
    {
        return (new \DateTimeImmutable('now', self::timezone($userId, $channel, $explicit)))->format('Y-m-d');
    }

    public static function nowLocalMysql(int $userId = 0, string $channel = 'app', mixed $explicit = null): string
    {
        return (new \DateTimeImmutable('now', self::timezone($userId, $channel, $explicit)))->format('Y-m-d H:i:s');
    }

    public static function nowLocalLabel(int $userId = 0, string $channel = 'app', mixed $explicit = null): string
    {
        $timezone = self::resolveTimezoneName($userId, $channel, $explicit);
        $now = new \DateTimeImmutable('now', self::timezone($userId, $channel, $timezone));
        return $now->format('Y-m-d H:i:s') . " ({$timezone})";
    }

    public static function parseDateTime(mixed $value, int $userId = 0, string $channel = 'app', mixed $timezone = null): \DateTimeImmutable
    {
        try {
            return new \DateTimeImmutable((string)$value, self::timezone($userId, $channel, $timezone));
        } catch (\Throwable) {
            throw new \InvalidArgumentException('Fecha inválida para la zona horaria del usuario.');
        }
    }

    public static function formatForTimezone(\DateTimeImmutable $date, mixed $timezone): string
    {
        $normalized = self::normalizeTimezone($timezone) ?? self::wordpressTimezoneName();
        return $date->setTimezone(new \DateTimeZone($normalized))->format('Y-m-d H:i:s');
    }

    public static function actionTimezoneName(array $actionOrPayload, int $userId = 0, string $channel = 'app'): string
    {
        $payload = is_array($actionOrPayload['payload'] ?? null) ? $actionOrPayload['payload'] : $actionOrPayload;
        $stored = self::normalizeTimezone($payload['timezone'] ?? $payload['user_timezone'] ?? null);
        if ($stored !== null) {
            return $stored;
        }

        /* Legacy: acciones anteriores a [125A-RT] se guardaron en timezone WordPress. */
        if (!array_key_exists('timezone', $payload) && !array_key_exists('user_timezone', $payload)) {
            return self::wordpressTimezoneName();
        }

        return self::resolveTimezoneName($userId, $channel);
    }

    public static function normalizeTimezone(mixed $timezone): ?string
    {
        if (!is_string($timezone)) {
            return null;
        }

        $timezone = trim($timezone);
        if ($timezone === '') {
            return null;
        }

        try {
            new \DateTimeZone($timezone);
            return $timezone;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function wordpressTimezoneName(): string
    {
        try {
            if (function_exists('wp_timezone')) {
                return self::wordpressTimezone()->getName();
            }
            if (function_exists('wp_timezone_string')) {
                $timezone = wp_timezone_string();
                if (is_string($timezone) && $timezone !== '') {
                    return $timezone;
                }
            }
        } catch (\Throwable) {
            return 'UTC';
        }

        return 'UTC';
    }

    private static function wordpressTimezone(): \DateTimeZone
    {
        try {
            if (function_exists('wp_timezone')) {
                return wp_timezone();
            }
        } catch (\Throwable) {
            return new \DateTimeZone('UTC');
        }

        return new \DateTimeZone('UTC');
    }

    private static function inferWhatsappTimezone(int $userId): ?string
    {
        global $wpdb;
        if (!isset($wpdb) || $userId <= 0) {
            return null;
        }

        $table = $wpdb->prefix . 'glory_whatsapp_accounts';
        $phone = $wpdb->get_var($wpdb->prepare("SELECT phone_primary FROM {$table} WHERE user_id = %d LIMIT 1", $userId));
        if (!is_string($phone) || $phone === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?: '';
        $map = [
            '58' => 'America/Caracas',
            '57' => 'America/Bogota',
            '51' => 'America/Lima',
            '56' => 'America/Santiago',
            '54' => 'America/Argentina/Buenos_Aires',
            '52' => 'America/Mexico_City',
            '34' => 'Europe/Madrid',
            '593' => 'America/Guayaquil',
            '591' => 'America/La_Paz',
            '595' => 'America/Asuncion',
            '598' => 'America/Montevideo',
            '502' => 'America/Guatemala',
            '503' => 'America/El_Salvador',
            '504' => 'America/Tegucigalpa',
            '505' => 'America/Managua',
            '506' => 'America/Costa_Rica',
            '507' => 'America/Panama',
        ];

        uksort($map, fn($a, $b): int => strlen((string)$b) <=> strlen((string)$a));
        foreach ($map as $prefix => $timezone) {
            if (str_starts_with($digits, (string)$prefix)) {
                return $timezone;
            }
        }

        return null;
    }
}