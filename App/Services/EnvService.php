<?php

namespace App\Services;

class EnvService
{
    private static ?array $envFileCache = null;

    public static function get(string $name): string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }

        return self::getFromFile($name);
    }

    public static function first(array $names): string
    {
        foreach ($names as $name) {
            $value = self::get((string)$name);
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    private static function getFromFile(string $name): string
    {
        if (self::$envFileCache === null) {
            self::$envFileCache = self::loadEnvFile();
        }

        $value = self::$envFileCache[$name] ?? '';
        return is_string($value) ? trim($value) : '';
    }

    private static function loadEnvFile(): array
    {
        $themeDir = function_exists('get_template_directory') ? get_template_directory() : dirname(__DIR__, 2);
        $envPath = rtrim((string)$themeDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.env';

        if (!is_readable($envPath)) {
            return [];
        }

        $vars = [];
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim((string)$line);
            if ($line === '' || substr($line, 0, 1) === '#') {
                continue;
            }
            if (!preg_match('/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/', $line, $matches)) {
                continue;
            }

            $key = trim($matches[1]);
            $raw = trim($matches[2]);
            $first = substr($raw, 0, 1);
            $last = substr($raw, -1);
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $raw = substr($raw, 1, -1);
            }
            $vars[$key] = trim($raw);
        }

        return $vars;
    }
}
