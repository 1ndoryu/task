<?php

/**
 * App Pages Configuration
 * 
 * Este archivo define todas las páginas gestionadas del proyecto.
 * 
 * MÉTODOS DISPONIBLES:
 * 
 * 1. reactPage() - RECOMENDADO para páginas React (simplificado)
 *    PageManager::reactPage('mi-pagina', 'MiIsland');
 *    PageManager::reactPage('mi-pagina', 'MiIsland', ['prop' => 'valor']);
 *    PageManager::reactPage('mi-pagina', 'MiIsland', fn($id) => [...]);
 * 
 * 2. define() - Para páginas con templates PHP personalizados
 *    PageManager::define('mi-pagina', 'miFuncion');
 * 
 * 3. registerReactFullPages() - Solo si usas define() para React
 *    PageManager::registerReactFullPages(['mi-pagina']);
 */

use Glory\Manager\PageManager;

PageManager::setDefaultContentMode('code');

/*
 * DASHBOARD
 * Página principal de productividad personal
 * Incluye: Hábitos, Tareas, Notas rápidas
 */
PageManager::reactPage('home', 'DashboardIsland', [
    'titulo' => 'Tasks',
    'usuario' => 'user@admin'
]);

/*
 * PÁGINA DE PRUEBA OCP
 * Demuestra el cumplimiento del principio Open/Closed
 * La island se registró en inicializarIslands.ts sin modificar appIslands.tsx
 */
PageManager::reactPage('prueba-ocp', 'PaginaPruebaIsland', [
    'titulo' => 'Sistema OCP Funcionando',
    'mensaje' => 'Esta página fue creada usando el nuevo sistema de auto-registro.'
]);

/*
 * CALCULADORA DE ARBITRAJE
 * Herramienta para calcular viabilidad de compra/venta internacional
 * Compara rutas de conversión USD → Bs → USDT/PayPal
 */
PageManager::reactPage('arbitraje', 'ArbitrajeIsland', [
    'titulo' => 'Calculadora de Arbitraje'
]);
