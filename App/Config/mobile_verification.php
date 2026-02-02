<?php
/*
 * Configuración para verificar App Links y Propiedad de Android
 * Sirve el archivo /.well-known/assetlinks.json requerido por Google.
 */

add_action('init', function () {
    /* Verificar si la solicitud es para assetlinks.json */
    if (strpos($_SERVER['REQUEST_URI'], '/.well-known/assetlinks.json') !== false) {
        header('Content-Type: application/json');
        
        $assetLinks = [
            [
                "relation" => ["delegate_permission/common.handle_all_urls"],
                "target" => [
                    "namespace" => "android_app",
                    "package_name" => "com.taskNakomi.app",
                    "sha256_cert_fingerprints" => [
                        "C2:0E:32:34:C7:98:99:B1:E5:19:B8:24:E0:BD:7D:82:7B:97:91:21:A6:02:7F:E7:6B:AF:BA:F8:B3:46:F4:A6"
                    ]
                ]
            ]
        ];

        echo json_encode($assetLinks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
});
