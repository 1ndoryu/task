<?php

$directorioTemaActivo = get_stylesheet_directory();

$autoloader = get_template_directory() . '/vendor/autoload.php';
if (file_exists($autoloader)) {
    require_once $autoloader;
} else {
    error_log('Error: Composer autoload no encontrado. Ejecuta "composer install".');
}

/*
 * IMPORTANTE: Cargar dotenv ANTES de Glory Framework
 * para que las variables de entorno esten disponibles
 * cuando los plugins se inicialicen.
 */
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Exception $e) {
    error_log('Error al cargar el archivo .env: ' . $e->getMessage());
}

/*
 * IMPORTANTE
 * /App son cosas especificas del proyecto.
 * /Glory debe mantener agnostico a cualquier proyecto.
 */

$glory_loader = get_template_directory() . '/Glory/load.php';
if (file_exists($glory_loader)) {
    require_once $glory_loader;
} else {
    error_log('Error: Glory Framework loader no encontrado.');
}


// Asegurar que los feature flags se establecen primero
$control_config = get_template_directory() . '/App/Config/control.php';
if (file_exists($control_config)) {
    include_once $control_config;
}

/*
 * Cargar todos los archivos de App/ para ejecutar hooks y registros.
 * El autoload PSR-4 en composer.json sirve como respaldo.
 */
function incluirArchivos($directorio)
{
    /* Evitar escanear directorios de frontend que no contienen PHP */
    if (str_contains($directorio, 'node_modules') || str_contains($directorio, 'React')) {
        return;
    }

    $ruta_completa = get_template_directory() . "/$directorio";

    $archivos = glob($ruta_completa . "*.php");
    foreach ($archivos as $archivo) {
        include_once $archivo;
    }

    $subdirectorios = glob($ruta_completa . "*/", GLOB_ONLYDIR);
    foreach ($subdirectorios as $subdirectorio) {
        /* Extraer solo el nombre del directorio para verificar */
        $dirname = basename($subdirectorio);
        if ($dirname === 'node_modules' || $dirname === 'React') {
            continue;
        }

        $ruta_relativa = str_replace(get_template_directory() . '/', '', $subdirectorio);
        incluirArchivos($ruta_relativa);
    }
}

$directorios = [
    'App/',
];

/* 
 * PRE-CARGA CRITICA:
 * Cargar dependencias de cifrado manualmente para evitar 
 * errores de "Trait not found" o "Class not found" si el autoloader falla
 * o el orden alfabético de carga causa conflictos (App/Repository/Actividad carga antes que CifradoTrait).
 */
$preCarga = [
    'App/Services/CifradoService.php',
    'App/Repository/CifradoTrait.php'
];

foreach ($preCarga as $archivoPre) {
    $rutaPre = get_template_directory() . '/' . $archivoPre;
    if (file_exists($rutaPre)) {
        include_once $rutaPre;
    }
}

foreach ($directorios as $directorio) {
    incluirArchivos($directorio);
}


// Fix SVG MIME type support
add_filter('upload_mimes', function ($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
});
add_filter('mime_types', function ($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
});

/* 
 * Remover site icon de WordPress y usar favicon personalizado
 */
add_action('wp_head', function () {
    $favicon_url = get_template_directory_uri() . '/Glory/assets/images/favicon.svg';
    echo '<link rel="icon" type="image/svg+xml" href="' . esc_url($favicon_url) . '">' . "\n";
}, 1);

// Remover el site icon de WordPress
remove_action('wp_head', 'wp_site_icon', 99);
