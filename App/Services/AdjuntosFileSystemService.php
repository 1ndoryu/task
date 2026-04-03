<?php

/**
 * Servicio de Sistema de Archivos para Adjuntos
 *
 * Gestiona operaciones de archivo en disco:
 * - Creación y protección de directorios
 * - Generación de thumbnails
 * - Eliminación, listado e información de archivos
 * - Cálculo de espacio usado
 * - Validación de seguridad contra path traversal
 *
 * @package App\Services
 */

namespace App\Services;

class AdjuntosFileSystemService
{
    private const DIRECTORIO_THUMBS = 'thumbs';
    private const DIRECTORIO_CACHE = 'cache';
    private const THUMBNAIL_SIZE = 200;

    private int $userId;
    private string $rutaBase;

    public function __construct(int $userId, string $rutaBase)
    {
        $this->userId = $userId;
        $this->rutaBase = $rutaBase;
    }

    /** Obtiene la ruta del directorio del usuario */
    public function getRutaUsuario(): string
    {
        return trailingslashit($this->rutaBase) . $this->userId;
    }

    /** Obtiene la ruta del directorio de thumbnails del usuario */
    public function getRutaThumbnails(): string
    {
        return trailingslashit($this->getRutaUsuario()) . self::DIRECTORIO_THUMBS;
    }

    /** Obtiene la ruta del directorio de cache del usuario */
    public function getRutaCache(): string
    {
        return trailingslashit($this->getRutaUsuario()) . self::DIRECTORIO_CACHE;
    }

    /**
     * Crea los directorios necesarios si no existen
     */
    public function asegurarDirectorios(): bool
    {
        $directorios = [
            $this->rutaBase,
            $this->getRutaUsuario(),
            $this->getRutaThumbnails(),
            $this->getRutaCache()
        ];

        foreach ($directorios as $dir) {
            if (!file_exists($dir)) {
                if (!wp_mkdir_p($dir)) {
                    error_log("[AdjuntosFileSystemService] No se pudo crear directorio: {$dir}");
                    return false;
                }
                self::protegerDirectorio($dir);
            }
        }

        /* Caso especial: el directorio de thumbnails permite acceso a imágenes
         * para que se puedan previsualizar sin pasar por la API */
        $thumbsHtaccess = trailingslashit($this->getRutaThumbnails()) . '.htaccess';
        if (!file_exists($thumbsHtaccess)) {
            $reglasThumb = "Order Deny,Allow\nDeny from all\n<FilesMatch \"\\.(jpg|jpeg|png|gif|webp)$\">\n    Allow from all\n</FilesMatch>\n";
            file_put_contents($thumbsHtaccess, $reglasThumb);
        }

        return true;
    }

    /**
     * Protege un directorio con .htaccess y index.php
     * Bloquea acceso directo HTTP a todos los archivos del directorio
     */
    public static function protegerDirectorio(string $directorio): void
    {
        $index = trailingslashit($directorio) . 'index.php';
        if (!file_exists($index)) {
            file_put_contents($index, '<?php // Silence is golden');
        }

        $htaccess = trailingslashit($directorio) . '.htaccess';
        if (!file_exists($htaccess)) {
            $reglas = "Order Deny,Allow\nDeny from all\n";
            file_put_contents($htaccess, $reglas);
        }
    }

    /** Genera un nombre único para el archivo basado en UUID */
    public function generarNombreArchivo(string $nombreOriginal): string
    {
        $extension = pathinfo($nombreOriginal, PATHINFO_EXTENSION);
        $hash = wp_generate_uuid4();

        return $hash . ($extension ? ".{$extension}" : '');
    }

    /**
     * Genera un thumbnail para imágenes
     * Si falla (ej. servidor sin GD/Imagick), retorna null sin detener el proceso
     */
    public function generarThumbnail(string $rutaImagen, string $nombreBase): ?string
    {
        $editor = wp_get_image_editor($rutaImagen);

        if (is_wp_error($editor)) {
            error_log('[AdjuntosFileSystemService] Warning: No se pudo generar thumbnail: ' . $editor->get_error_message());
            return null;
        }

        $resultadoResize = $editor->resize(self::THUMBNAIL_SIZE, self::THUMBNAIL_SIZE, true);
        if (is_wp_error($resultadoResize)) {
            return null;
        }

        $rutaThumb = trailingslashit($this->getRutaThumbnails()) . $nombreBase . '.jpg';
        $resultado = $editor->save($rutaThumb, 'image/jpeg');

        if (is_wp_error($resultado)) {
            error_log('[AdjuntosFileSystemService] Warning: Error guardando thumbnail: ' . $resultado->get_error_message());
            return null;
        }

        return $rutaThumb;
    }

    /**
     * Valida que una ruta de archivo permanezca dentro del directorio del usuario
     * Previene ataques de path traversal donde un nombreArchivo como
     * "../../wp-config.php" podría escapar del directorio seguro
     */
    public function validarRutaSegura(string $rutaArchivo): bool
    {
        $directorioUsuario = $this->getRutaUsuario();

        if (file_exists($rutaArchivo)) {
            $rutaReal = realpath($rutaArchivo);
        } else {
            $directorioPadre = dirname($rutaArchivo);
            $rutaReal = realpath($directorioPadre);
            if ($rutaReal !== false) {
                $rutaReal .= DIRECTORY_SEPARATOR . basename($rutaArchivo);
            }
        }

        if ($rutaReal === false) {
            return false;
        }

        /* Normalizar separadores para comparación en Windows */
        $rutaReal = str_replace('\\', '/', $rutaReal);
        $directorioUsuario = str_replace('\\', '/', $directorioUsuario);

        return str_starts_with($rutaReal, $directorioUsuario);
    }

    /**
     * Elimina un archivo y su thumbnail si existe
     */
    public function eliminarArchivo(string $nombreArchivo): bool
    {
        $rutaArchivo = trailingslashit($this->getRutaUsuario()) . $nombreArchivo;

        if (!$this->validarRutaSegura($rutaArchivo)) {
            error_log('[AdjuntosFileSystemService] Path traversal detectado en eliminación: ' . $nombreArchivo);
            return false;
        }

        $eliminado = false;

        if (file_exists($rutaArchivo)) {
            $eliminado = unlink($rutaArchivo);
        }

        /* Eliminar thumbnail si existe */
        $nombreBase = pathinfo($nombreArchivo, PATHINFO_FILENAME);
        $nombreBase = preg_replace('/\.(enc|raw)$/', '', $nombreBase);

        $rutaThumb = trailingslashit($this->getRutaThumbnails()) . $nombreBase . '.jpg';
        if (file_exists($rutaThumb)) {
            unlink($rutaThumb);
        }

        return $eliminado;
    }

    /** Lista todos los archivos del usuario */
    public function listarArchivos(): array
    {
        $directorio = $this->getRutaUsuario();

        if (!is_dir($directorio)) {
            return [];
        }

        $archivos = [];
        $items = scandir($directorio);

        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === self::DIRECTORIO_THUMBS || $item === self::DIRECTORIO_CACHE) {
                continue;
            }

            $rutaCompleta = trailingslashit($directorio) . $item;

            if (is_file($rutaCompleta)) {
                $archivos[] = $this->obtenerInfoArchivo($item);
            }
        }

        return array_filter($archivos);
    }

    /** Obtiene información de un archivo sin descargarlo */
    public function obtenerInfoArchivo(string $nombreArchivo): ?array
    {
        $rutaArchivo = trailingslashit($this->getRutaUsuario()) . $nombreArchivo;

        if (!$this->validarRutaSegura($rutaArchivo)) {
            return null;
        }

        if (!file_exists($rutaArchivo)) {
            return null;
        }

        $tamano = filesize($rutaArchivo);
        $mimeType = mime_content_type($rutaArchivo);
        $esCifrado = str_ends_with($nombreArchivo, '.enc');

        return [
            'nombreArchivo' => $nombreArchivo,
            'tamano' => $tamano,
            'mimeType' => $mimeType,
            'cifrado' => $esCifrado,
            'fechaModificacion' => date('Y-m-d H:i:s', filemtime($rutaArchivo))
        ];
    }

    /** Calcula el espacio usado por el usuario en archivos físicos */
    public function calcularEspacioUsado(): int
    {
        $directorio = $this->getRutaUsuario();

        if (!is_dir($directorio)) {
            return 0;
        }

        $total = 0;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directorio, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $archivo) {
            if ($archivo->isFile()) {
                $total += $archivo->getSize();
            }
        }

        return $total;
    }
}
