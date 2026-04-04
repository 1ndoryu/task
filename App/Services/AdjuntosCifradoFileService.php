<?php

/**
 * Servicio de Cifrado de Archivos para Adjuntos
 *
 * Gestiona el cifrado/descifrado de archivos adjuntos y la cache
 * de archivos descifrados para acceso rápido.
 *
 * Formatos de archivo cifrado:
 * - M: (memoria) - Archivo cifrado en un solo bloque (< 1MB)
 * - S: (stream)  - Archivo cifrado en chunks independientes de 8KB (> 1MB)
 *
 * @package App\Services
 */

namespace App\Services;

class AdjuntosCifradoFileService
{
    private const CHUNK_SIZE = 8192; /* 8KB para stream cipher */
    private const UMBRAL_STREAM = 1048576; /* 1MB - usar stream cipher para archivos mayores */
    private const CACHE_TTL = 300; /* 5 minutos de vida del cache */

    private ?CifradoService $cifradoService;
    private string $rutaUsuario;
    private string $rutaCache;

    public function __construct(?CifradoService $cifradoService, string $rutaUsuario, string $rutaCache)
    {
        $this->cifradoService = $cifradoService;
        $this->rutaUsuario = $rutaUsuario;
        $this->rutaCache = $rutaCache;
    }

    /**
     * Guarda un archivo cifrado
     *
     * Para archivos pequenos (<1MB): cifra en memoria (mas eficiente)
     * Para archivos grandes (>1MB): usa stream cipher en chunks de 8KB
     */
    public function guardarArchivoCifrado(string $rutaOrigen, string $rutaDestino): bool
    {
        if ($this->cifradoService === null) {
            return false;
        }

        try {
            $tamanoArchivo = filesize($rutaOrigen);

            if ($tamanoArchivo <= self::UMBRAL_STREAM) {
                return $this->cifrarEnMemoria($rutaOrigen, $rutaDestino);
            }

            return $this->cifrarEnStream($rutaOrigen, $rutaDestino);
        } catch (\Exception $e) {
            error_log('[AdjuntosCifradoFileService] Error cifrando archivo: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtiene y descifra un archivo cifrado
     * Verifica cache antes de descifrar, guarda en cache despues
     *
     * @param string $rutaArchivo Ruta completa al archivo cifrado
     * @param string $nombreArchivo Nombre del archivo (para clave de cache)
     * @return string|null Contenido descifrado o null si falla
     */
    public function obtenerArchivoCifrado(string $rutaArchivo, string $nombreArchivo): ?string
    {
        /* Verificar cache primero */
        $contenidoCache = $this->obtenerDeCache($nombreArchivo);
        if ($contenidoCache !== null) {
            return $contenidoCache;
        }

        if ($this->cifradoService === null) {
            error_log('[AdjuntosCifradoFileService] Archivo cifrado sin servicio de cifrado disponible');
            return null;
        }

        try {
            $contenidoCifrado = file_get_contents($rutaArchivo);
            if ($contenidoCifrado === false) {
                return null;
            }

            $contenido = $this->descifrarArchivo($contenidoCifrado);

            /* Guardar en cache para futuras peticiones */
            // sentinel-disable-next-line retorno-ignorado-repo — cache write, no critico
            $this->guardarEnCache($nombreArchivo, $contenido);

            return $contenido;
        } catch (\Exception $e) {
            error_log('[AdjuntosCifradoFileService] Error descifrando archivo: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Limpia archivos expirados del cache
     * Diseñado para ejecutarse como cron job cada 5 minutos
     */
    public function limpiarCache(): int
    {
        if (!is_dir($this->rutaCache)) {
            return 0;
        }

        $eliminados = 0;
        $archivos = scandir($this->rutaCache);

        foreach ($archivos as $archivo) {
            if ($archivo === '.' || $archivo === '..' || $archivo === 'index.php' || $archivo === '.htaccess') {
                continue;
            }

            $rutaCompleta = trailingslashit($this->rutaCache) . $archivo;

            if (!is_file($rutaCompleta)) {
                continue;
            }

            /* Verificar si ha expirado */
            if (time() - filemtime($rutaCompleta) > self::CACHE_TTL) {
                unlink($rutaCompleta);
                $eliminados++;
            }
        }

        return $eliminados;
    }

    /**
     * Cifra un archivo pequeno en memoria
     */
    private function cifrarEnMemoria(string $rutaOrigen, string $rutaDestino): bool
    {
        $contenido = file_get_contents($rutaOrigen);
        if ($contenido === false) {
            return false;
        }

        $cifrado = $this->cifradoService->cifrar($contenido);

        /* Guardar con marcador de tipo (M = memoria, S = stream) */
        $resultado = file_put_contents($rutaDestino, 'M:' . $cifrado);

        return $resultado !== false;
    }

    /**
     * Cifra un archivo grande usando stream cipher (chunks de 8KB)
     * Cada chunk se cifra independientemente para permitir descifrado parcial
     */
    private function cifrarEnStream(string $rutaOrigen, string $rutaDestino): bool
    {
        $origen = fopen($rutaOrigen, 'rb');
        $destino = fopen($rutaDestino, 'wb');

        if (!$origen || !$destino) {
            return false;
        }

        try {
            /* Escribir marcador de tipo stream */
            fwrite($destino, 'S:');

            /* Primera pasada: contar chunks para el header */
            $numChunks = 0;
            while (!feof($origen)) {
                $chunk = fread($origen, self::CHUNK_SIZE);
                if ($chunk !== false && strlen($chunk) > 0) {
                    $numChunks++;
                }
            }

            /* Escribir número de chunks (4 bytes, big-endian) */
            fwrite($destino, pack('N', $numChunks));

            /* Volver al inicio */
            rewind($origen);

            /* Segunda pasada: cifrar cada chunk */
            while (!feof($origen)) {
                $chunk = fread($origen, self::CHUNK_SIZE);
                if ($chunk === false || strlen($chunk) === 0) {
                    break;
                }

                $chunkCifrado = $this->cifradoService->cifrar($chunk);
                $longitudChunk = strlen($chunkCifrado);

                /* Escribir longitud del chunk cifrado (4 bytes) + datos */
                fwrite($destino, pack('N', $longitudChunk));
                fwrite($destino, $chunkCifrado);
            }

            return true;
        } finally {
            fclose($origen);
            fclose($destino);
        }
    }

    /**
     * Descifra contenido de archivo según su formato
     * Soporta formato M: (memoria) y S: (stream)
     */
    private function descifrarArchivo(string $contenidoCifrado): string
    {
        $tipo = substr($contenidoCifrado, 0, 2);
        $datos = substr($contenidoCifrado, 2);

        if ($tipo === 'M:') {
            return $this->cifradoService->descifrar($datos);
        }

        if ($tipo === 'S:') {
            return $this->descifrarStream($datos);
        }

        /* Formato legacy (sin marcador): intentar descifrar directamente */
        return $this->cifradoService->descifrar($contenidoCifrado);
    }

    /** Descifra un archivo en formato stream */
    private function descifrarStream(string $datos): string
    {
        $offset = 0;

        /* Leer número de chunks (4 bytes) */
        $numChunks = unpack('N', substr($datos, $offset, 4))[1];
        $offset += 4;

        $resultado = '';

        for ($i = 0; $i < $numChunks; $i++) {
            /* Leer longitud del chunk (4 bytes) */
            $longitudChunk = unpack('N', substr($datos, $offset, 4))[1];
            $offset += 4;

            $chunkCifrado = substr($datos, $offset, $longitudChunk);
            $offset += $longitudChunk;

            $resultado .= $this->cifradoService->descifrar($chunkCifrado);
        }

        return $resultado;
    }

    /** Obtiene archivo del cache si existe y no ha expirado */
    private function obtenerDeCache(string $nombreArchivo): ?string
    {
        $rutaCache = trailingslashit($this->rutaCache) . md5($nombreArchivo);

        if (!file_exists($rutaCache)) {
            return null;
        }

        /* Verificar TTL */
        $tiempoModificacion = filemtime($rutaCache);
        if (time() - $tiempoModificacion > self::CACHE_TTL) {
            unlink($rutaCache);
            return null;
        }

        $contenido = file_get_contents($rutaCache);

        /* Descifrar cache si está cifrado */
        if ($this->cifradoService !== null && $this->cifradoService->estaCifrado($contenido)) {
            try {
                $contenido = $this->cifradoService->descifrar($contenido);
            } catch (\Exception $e) {
                error_log('[AdjuntosCifradoFileService] Error descifrando cache, se invalida');
                unlink($rutaCache);
                return null;
            }
        }

        return $contenido;
    }

    /**
     * Guarda contenido descifrado en cache
     * El contenido se cifra en cache para evitar que datos sensibles
     * queden en texto plano en disco durante el TTL
     */
    private function guardarEnCache(string $nombreArchivo, string $contenido): void
    {
        if (!is_dir($this->rutaCache)) {
            wp_mkdir_p($this->rutaCache);
            AdjuntosFileSystemService::protegerDirectorio($this->rutaCache);
        }

        /* Cifrar el contenido del cache para seguridad */
        $contenidoCache = $contenido;
        if ($this->cifradoService !== null) {
            try {
                $contenidoCache = $this->cifradoService->cifrar($contenido);
            } catch (\Exception $e) {
                error_log('[AdjuntosCifradoFileService] Error cifrando cache, se omite');
                return;
            }
        }

        $rutaArchivo = trailingslashit($this->rutaCache) . md5($nombreArchivo);
        file_put_contents($rutaArchivo, $contenidoCache);
    }
}
