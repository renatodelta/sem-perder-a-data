<?php
// enviar_alerta_agendado.php
// Script acionado por CRON (ex: a cada hora) ou manualmente para enviar avisos de 24h

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/db.php';
$pushConfig = require __DIR__ . '/push_config.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$testMode = isset($_GET['test']) && $_GET['test'] == '1';

// Busca todas as inscrições de celulares ativos
$subsStmt = $pdo->query("SELECT * FROM push_subscriptions ORDER BY id DESC");
$subscriptions = $subsStmt->fetchAll();

if (empty($subscriptions)) {
    echo json_encode([
        'success' => false,
        'message' => 'Nenhum celular inscrito ainda. Abra o app no celular e clique no sino para ativar!'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

$webPush = new WebPush($pushConfig);
$notificationsSent = 0;
$reports = [];

if ($testMode) {
    // DISPARO DE TESTE IMEDIATO
    $payload = json_encode([
        'title' => '🔔 Teste de Notificação com App Fechado!',
        'body' => '🎉 Sucesso! O servidor enviou este alerta mesmo com seu celular desligado ou aplicativo fechado.',
        'icon' => 'assets/icons/icon-192.png',
        'badge' => 'assets/icons/icon-192.png',
        'data' => ['url' => './']
    ], JSON_UNESCAPED_UNICODE);

    foreach ($subscriptions as $sub) {
        $subscription = Subscription::create([
            'endpoint' => $sub['endpoint'],
            'publicKey' => $sub['p256dh'],
            'authToken' => $sub['auth'],
        ]);
        $webPush->queueNotification($subscription, $payload);
    }
} else {
    // DISPARO DE ALERTA DE 24 HORAS (COMPROMISSOS DE AMANHÃ)
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    $stmt = $pdo->prepare("
        SELECT a.*, p.name as person_name 
        FROM appointments a
        JOIN persons p ON a.person_id = p.id
        WHERE a.appointment_date = ? AND a.status = 'agendada'
    ");
    $stmt->execute([$tomorrow]);
    $upcomingAppointments = $stmt->fetchAll();

    if (empty($upcomingAppointments)) {
        echo json_encode([
            'success' => true,
            'message' => 'Nenhum compromisso agendado para amanhã (' . date('d/m/Y', strtotime($tomorrow)) . ').'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    foreach ($upcomingAppointments as $app) {
        $hora = !empty($app['appointment_time']) ? substr($app['appointment_time'], 0, 5) : 'horário a confirmar';
        $payload = json_encode([
            'title' => "⏰ Lembrete de 24h: {$app['person_name']} amanhã!",
            'body' => "📍 {$app['specialty']} em {$app['city']} às {$hora}. Prepare os documentos e exames!",
            'icon' => 'assets/icons/icon-192.png',
            'badge' => 'assets/icons/icon-192.png',
            'data' => ['url' => './']
        ], JSON_UNESCAPED_UNICODE);

        foreach ($subscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint' => $sub['endpoint'],
                'publicKey' => $sub['p256dh'],
                'authToken' => $sub['auth'],
            ]);
            $webPush->queueNotification($subscription, $payload);
        }
    }
}

// Processa a fila e envia para Apple/Google
foreach ($webPush->flush() as $report) {
    $endpoint = $report->getRequest()->getUri()->__toString();
    $isSuccess = $report->isSuccess();
    $reports[] = [
        'endpoint' => substr($endpoint, 0, 45) . '...',
        'success' => $isSuccess,
        'reason' => $report->getReason()
    ];
    if ($isSuccess) {
        $notificationsSent++;
    } else if ($report->isSubscriptionExpired()) {
        // Remove aparelho desinstalado / chave expirada
        $del = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = ?");
        $del->execute([$endpoint]);
    }
}

echo json_encode([
    'success' => true,
    'enviados' => $notificationsSent,
    'total_aparelhos' => count($subscriptions),
    'detalhes' => $reports
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
