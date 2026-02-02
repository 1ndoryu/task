#!/usr/bin/env php
<?php
/**
 * Script de diagnóstico para verificar la carga de APIs en producción
 */

// Simular entorno de WordPress mínimo
define('ABSPATH', '/var/www/html/');
define('WP_DEBUG', true);

echo "=== DIAGNÓSTICO API GLORY ===\n\n";

// 1. Verificar composer autoload
echo "1. Verificando Composer Autoload...\n";
$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    echo "   ✓ Autoload encontrado: $autoloadPath\n";
    require_once $autoloadPath;
    echo "   ✓ Autoload cargado correctamente\n";
} else {
    echo "   ✗ Autoload NO encontrado\n";
    exit(1);
}

// 2. Verificar namespace App\
echo "\n2. Verificando namespace App\\...\n";
try {
    $testClass = new ReflectionClass('App\\Api\\DashboardApiController');
    echo "   ✓ Clase App\\Api\\DashboardApiController encontrada\n";
    echo "   - Archivo: " . $testClass->getFileName() . "\n";
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

// 3. Verificar CifradoTrait
echo "\n3. Verificando CifradoTrait...\n";
try {
    $traitReflection = new ReflectionClass('App\\Repository\\CifradoTrait');
    echo "   ✓ Trait App\\Repository\\CifradoTrait encontrado\n";
    echo "   - Archivo: " . $traitReflection->getFileName() . "\n";
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

// 4. Verificar ActividadRepository
echo "\n4. Verificando ActividadRepository...\n";
try {
    $classReflection = new ReflectionClass('App\\Repository\\ActividadRepository');
    echo "   ✓ Clase App\\Repository\\ActividadRepository encontrada\n";
    echo "   - Archivo: " . $classReflection->getFileName() . "\n";
    
    // Verificar traits
    $traits = $classReflection->getTraitNames();
    echo "   - Traits usados: " . implode(', ', $traits) . "\n";
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

// 5. Listar clases cargadas del namespace App
echo "\n5. Clases del namespace App\\ cargadas:\n";
$loadedClasses = get_declared_classes();
$appClasses = array_filter($loadedClasses, function($class) {
    return strpos($class, 'App\\') === 0;
});
echo "   Total: " . count($appClasses) . " clases\n";
foreach (array_slice($appClasses, 0, 10) as $class) {
    echo "   - $class\n";
}
if (count($appClasses) > 10) {
    echo "   ... y " . (count($appClasses) - 10) . " más\n";
}

// 6. Verificar archivos en App/Api
echo "\n6. Archivos en App/Api/...\n";
$apiDir = __DIR__ . '/App/Api';
if (is_dir($apiDir)) {
    $files = glob($apiDir . '/*.php');
    echo "   Total: " . count($files) . " archivos PHP\n";
    foreach (array_slice($files, 0, 5) as $file) {
        echo "   - " . basename($file) . "\n";
    }
} else {
    echo "   ✗ Directorio no encontrado\n";
}

echo "\n=== FIN DIAGNÓSTICO ===\n";
