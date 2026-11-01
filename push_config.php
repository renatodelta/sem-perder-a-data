<?php
// push_config.php - Configurações VAPID para Web Push Notifications
// As chaves VAPID identificam o seu servidor com segurança perante o Google (FCM) e Apple (APNs)

if (!getenv('OPENSSL_CONF') && file_exists('C:/xampp/apache/conf/openssl.cnf')) {
    putenv('OPENSSL_CONF=C:/xampp/apache/conf/openssl.cnf');
}

return [
    'VAPID' => [
        'subject' => 'mailto:admin@semperderadata.local',
        'publicKey' => 'BHLVYyEtgS03hBshXPDbjgNtYZ6kQzydxFtSxC0W_A-roF5Ypj8lnoV9KbH_dPoDa5tLob5NUs1KmELCav37_40',
        'privateKey' => 'zEBJsmnvBCDtlFuQ3yzbnNP6Az9Gz-YxVJPnU_SqXoc',
    ]
];
