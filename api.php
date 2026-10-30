<?php
// api.php - API REST JSON para "Sem Perder a Data"
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

function responseJson($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    switch ($action) {
        case 'get_all_data':
            // 1. Pessoas
            $personsStmt = $pdo->query("SELECT * FROM persons ORDER BY CASE WHEN name = 'Ednéia' THEN 0 ELSE 1 END, name ASC");
            $persons = $personsStmt->fetchAll();

            // 2. Consultas
            $appStmt = $pdo->query("
                SELECT a.*, p.name as person_name, p.relation as person_relation, p.color as person_color,
                       (SELECT COUNT(*) FROM exams e WHERE e.target_appointment_id = a.id) as exams_to_bring_count
                FROM appointments a
                JOIN persons p ON a.person_id = p.id
                ORDER BY a.appointment_date ASC, a.appointment_time ASC
            ");
            $appointments = $appStmt->fetchAll();

            // 3. Exames
            $examStmt = $pdo->query("
                SELECT e.*, p.name as person_name, p.relation as person_relation, p.color as person_color,
                       target_app.appointment_date as target_appointment_date,
                       target_app.doctor_name as target_doctor_name,
                       target_app.specialty as target_specialty,
                       target_app.city as target_city
                FROM exams e
                JOIN persons p ON e.person_id = p.id
                LEFT JOIN appointments target_app ON e.target_appointment_id = target_app.id
                ORDER BY 
                    CASE 
                        WHEN e.status = 'pronto_levar' THEN 0
                        WHEN e.status = 'a_agendar' THEN 1
                        WHEN e.status = 'agendado' THEN 2
                        WHEN e.status = 'feito_aguardando' THEN 3
                        ELSE 4 
                    END,
                    e.exam_date ASC
            ");
            $exams = $examStmt->fetchAll();

            // 4. Remédios
            $medStmt = $pdo->query("
                SELECT m.*, p.name as person_name, p.relation as person_relation, p.color as person_color
                FROM medications m
                JOIN persons p ON m.person_id = p.id
                ORDER BY m.needs_purchase DESC, p.name ASC, m.name ASC
            ");
            $medications = $medStmt->fetchAll();

            // 5. Cálculo inteligente de Logística / Viagens Compartilhadas
            // Coletamos todos os eventos com data e cidade (consultas + exames agendados)
            $logisticsEvents = [];

            foreach ($appointments as $a) {
                if ($a['status'] !== 'cancelada' && !empty($a['appointment_date']) && !empty($a['city'])) {
                    $key = trim($a['appointment_date']) . '___' . mb_strtolower(trim($a['city']), 'UTF-8');
                    $logisticsEvents[$key][] = [
                        'type' => 'consulta',
                        'id' => $a['id'],
                        'date' => $a['appointment_date'],
                        'time' => $a['appointment_time'] ?? 'Sem hora',
                        'city' => trim($a['city']),
                        'person_id' => $a['person_id'],
                        'person_name' => $a['person_name'],
                        'person_color' => $a['person_color'],
                        'title' => 'Consulta: ' . $a['specialty'] . ($a['doctor_name'] ? ' (' . $a['doctor_name'] . ')' : ''),
                        'location' => $a['location_name'] ?? 'Local a confirmar',
                        'exams_to_bring' => (int)$a['exams_to_bring_count']
                    ];
                }
            }

            foreach ($exams as $e) {
                if ($e['status'] === 'agendado' && !empty($e['exam_date']) && !empty($e['city'])) {
                    $key = trim($e['exam_date']) . '___' . mb_strtolower(trim($e['city']), 'UTF-8');
                    $logisticsEvents[$key][] = [
                        'type' => 'exame',
                        'id' => $e['id'],
                        'date' => $e['exam_date'],
                        'time' => $e['exam_time'] ?? 'Sem hora',
                        'city' => trim($e['city']),
                        'person_id' => $e['person_id'],
                        'person_name' => $e['person_name'],
                        'person_color' => $e['person_color'],
                        'title' => 'Exame: ' . $e['exam_name'],
                        'location' => $e['location_name'] ?? 'Laboratório',
                        'exams_to_bring' => 0
                    ];
                }
            }

            // Agrupa e detecta oportunidades (dias na mesma cidade com > 1 evento ou > 1 pessoa)
            $trips = [];
            foreach ($logisticsEvents as $key => $events) {
                $uniquePersons = [];
                foreach ($events as $ev) {
                    $uniquePersons[$ev['person_id']] = [
                        'id' => $ev['person_id'],
                        'name' => $ev['person_name'],
                        'color' => $ev['person_color']
                    ];
                }

                // Verifica se há remédios pendentes para comprar preferencialmente nesta cidade
                $sampleDate = $events[0]['date'];
                $city = $events[0]['city'];
                $medsToBuyInCity = [];
                foreach ($medications as $m) {
                    if ($m['needs_purchase'] == 1) {
                        $pCity = mb_strtolower(trim($m['preferred_city'] ?? ''), 'UTF-8');
                        $targetCity = mb_strtolower(trim($city), 'UTF-8');
                        if (empty($pCity) || $pCity === $targetCity) {
                            $medsToBuyInCity[] = [
                                'name' => $m['name'],
                                'person_name' => $m['person_name'],
                                'person_color' => $m['person_color']
                            ];
                        }
                    }
                }

                $trips[] = [
                    'date' => $sampleDate,
                    'city' => $city,
                    'total_events' => count($events),
                    'total_people' => count($uniquePersons),
                    'people' => array_values($uniquePersons),
                    'events' => $events,
                    'is_shared_ride' => count($uniquePersons) > 1, // Mais de uma pessoa indo junto!
                    'meds_to_buy' => $medsToBuyInCity
                ];
            }

            // Ordena as viagens por data
            usort($trips, function($a, $b) {
                return strcmp($a['date'], $b['date']);
            });

            // Resumo estatístico para o Dashboard
            $today = date('Y-m-d');
            $in7Days = date('Y-m-d', strtotime('+7 days'));

            $summary = [
                'today_appointments' => 0,
                'week_appointments' => 0,
                'exams_to_schedule' => 0,
                'exams_ready_to_bring' => 0,
                'meds_to_buy' => 0,
                'shared_trips_count' => 0
            ];

            foreach ($appointments as $a) {
                if ($a['status'] === 'agendada') {
                    if ($a['appointment_date'] === $today) {
                        $summary['today_appointments']++;
                    }
                    if ($a['appointment_date'] >= $today && $a['appointment_date'] <= $in7Days) {
                        $summary['week_appointments']++;
                    }
                }
            }

            foreach ($exams as $e) {
                if ($e['status'] === 'a_agendar') $summary['exams_to_schedule']++;
                if ($e['status'] === 'pronto_levar') $summary['exams_ready_to_bring']++;
            }

            foreach ($medications as $m) {
                if ($m['needs_purchase'] == 1) $summary['meds_to_buy']++;
            }

            foreach ($trips as $t) {
                if ($t['date'] >= $today && $t['is_shared_ride']) {
                    $summary['shared_trips_count']++;
                }
            }

            responseJson([
                'success' => true,
                'persons' => $persons,
                'appointments' => $appointments,
                'exams' => $exams,
                'medications' => $medications,
                'trips' => $trips,
                'summary' => $summary,
                'current_date' => $today
            ]);
            break;

        // --- SALVAR PESSOA ---
        case 'save_person':
            $id = $input['id'] ?? null;
            $name = trim($input['name'] ?? '');
            $relation = trim($input['relation'] ?? '');
            $color = trim($input['color'] ?? '#3b82f6');
            $notes = trim($input['notes'] ?? '');

            if (empty($name)) {
                responseJson(['error' => 'O nome é obrigatório'], 400);
            }

            if ($id) {
                $stmt = $pdo->prepare("UPDATE persons SET name = ?, relation = ?, color = ?, notes = ? WHERE id = ?");
                $stmt->execute([$name, $relation, $color, $notes, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO persons (name, relation, color, notes) VALUES (?, ?, ?, ?)");
                $stmt->execute([$name, $relation, $color, $notes]);
                $id = $pdo->lastInsertId();
            }

            responseJson(['success' => true, 'id' => $id]);
            break;

        case 'delete_person':
            $id = (int)($input['id'] ?? 0);
            if ($id > 0) {
                $stmt = $pdo->prepare("DELETE FROM persons WHERE id = ?");
                $stmt->execute([$id]);
            }
            responseJson(['success' => true]);
            break;

        // --- SALVAR CONSULTA ---
        case 'save_appointment':
            $id = $input['id'] ?? null;
            $person_id = (int)($input['person_id'] ?? 0);
            $doctor_name = trim($input['doctor_name'] ?? '');
            $specialty = trim($input['specialty'] ?? '');
            $location_name = trim($input['location_name'] ?? '');
            $city = trim($input['city'] ?? '');
            $appointment_date = trim($input['appointment_date'] ?? '');
            $appointment_time = trim($input['appointment_time'] ?? '');
            $status = trim($input['status'] ?? 'agendada');
            $notes = trim($input['notes'] ?? '');

            if ($person_id <= 0 || empty($specialty) || empty($appointment_date) || empty($city)) {
                responseJson(['error' => 'Preencha a pessoa, especialidade, cidade e data da consulta.'], 400);
            }

            if ($id) {
                $stmt = $pdo->prepare("
                    UPDATE appointments 
                    SET person_id = ?, doctor_name = ?, specialty = ?, location_name = ?, city = ?, 
                        appointment_date = ?, appointment_time = ?, status = ?, notes = ?
                    WHERE id = ?
                ");
                $stmt->execute([$person_id, $doctor_name, $specialty, $location_name, $city, $appointment_date, $appointment_time ?: null, $status, $notes, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$person_id, $doctor_name, $specialty, $location_name, $city, $appointment_date, $appointment_time ?: null, $status, $notes]);
                $id = $pdo->lastInsertId();
            }

            responseJson(['success' => true, 'id' => $id]);
            break;

        case 'update_appointment_status':
            $id = (int)($input['id'] ?? 0);
            $status = trim($input['status'] ?? 'agendada');
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE appointments SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
            }
            responseJson(['success' => true]);
            break;

        case 'delete_appointment':
            $id = (int)($input['id'] ?? 0);
            if ($id > 0) {
                $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = ?");
                $stmt->execute([$id]);
            }
            responseJson(['success' => true]);
            break;

        // --- SALVAR EXAME ---
        case 'save_exam':
            $id = $input['id'] ?? null;
            $person_id = (int)($input['person_id'] ?? 0);
            $exam_name = trim($input['exam_name'] ?? '');
            $requested_by = !empty($input['requested_by_appointment_id']) ? (int)$input['requested_by_appointment_id'] : null;
            $target_app = !empty($input['target_appointment_id']) ? (int)$input['target_appointment_id'] : null;
            $exam_date = !empty($input['exam_date']) ? trim($input['exam_date']) : null;
            $exam_time = !empty($input['exam_time']) ? trim($input['exam_time']) : null;
            $location_name = trim($input['location_name'] ?? '');
            $city = trim($input['city'] ?? '');
            $status = trim($input['status'] ?? 'a_agendar');
            $result_notes = trim($input['result_notes'] ?? '');

            if ($person_id <= 0 || empty($exam_name)) {
                responseJson(['error' => 'Informe a pessoa e o nome do exame.'], 400);
            }

            if ($id) {
                $stmt = $pdo->prepare("
                    UPDATE exams 
                    SET person_id = ?, exam_name = ?, requested_by_appointment_id = ?, target_appointment_id = ?, 
                        exam_date = ?, exam_time = ?, location_name = ?, city = ?, status = ?, result_notes = ?
                    WHERE id = ?
                ");
                $stmt->execute([$person_id, $exam_name, $requested_by, $target_app, $exam_date, $exam_time, $location_name, $city, $status, $result_notes, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO exams (person_id, exam_name, requested_by_appointment_id, target_appointment_id, exam_date, exam_time, location_name, city, status, result_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$person_id, $exam_name, $requested_by, $target_app, $exam_date, $exam_time, $location_name, $city, $status, $result_notes]);
                $id = $pdo->lastInsertId();
            }

            responseJson(['success' => true, 'id' => $id]);
            break;

        case 'update_exam_status':
            $id = (int)($input['id'] ?? 0);
            $status = trim($input['status'] ?? 'a_agendar');
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE exams SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
            }
            responseJson(['success' => true]);
            break;

        case 'delete_exam':
            $id = (int)($input['id'] ?? 0);
            if ($id > 0) {
                $stmt = $pdo->prepare("DELETE FROM exams WHERE id = ?");
                $stmt->execute([$id]);
            }
            responseJson(['success' => true]);
            break;

        // --- SALVAR REMÉDIO ---
        case 'save_medication':
            $id = $input['id'] ?? null;
            $person_id = (int)($input['person_id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $dosage = trim($input['dosage'] ?? '');
            $instructions = trim($input['instructions'] ?? '');
            $is_continuous = isset($input['is_continuous']) ? (int)$input['is_continuous'] : 1;
            $needs_purchase = isset($input['needs_purchase']) ? (int)$input['needs_purchase'] : 0;
            $preferred_city = trim($input['preferred_city'] ?? '');
            $notes = trim($input['notes'] ?? '');

            if ($person_id <= 0 || empty($name)) {
                responseJson(['error' => 'Informe a pessoa e o nome do remédio.'], 400);
            }

            if ($id) {
                $stmt = $pdo->prepare("
                    UPDATE medications 
                    SET person_id = ?, name = ?, dosage = ?, instructions = ?, is_continuous = ?, 
                        needs_purchase = ?, preferred_city = ?, notes = ?
                    WHERE id = ?
                ");
                $stmt->execute([$person_id, $name, $dosage, $instructions, $is_continuous, $needs_purchase, $preferred_city, $notes, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO medications (person_id, name, dosage, instructions, is_continuous, needs_purchase, preferred_city, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$person_id, $name, $dosage, $instructions, $is_continuous, $needs_purchase, $preferred_city, $notes]);
                $id = $pdo->lastInsertId();
            }

            responseJson(['success' => true, 'id' => $id]);
            break;

        case 'toggle_medication_purchase':
            $id = (int)($input['id'] ?? 0);
            $needs = (int)($input['needs_purchase'] ?? 0);
            if ($id > 0) {
                $stmt = $pdo->prepare("UPDATE medications SET needs_purchase = ? WHERE id = ?");
                $stmt->execute([$needs, $id]);
            }
            responseJson(['success' => true]);
            break;

        case 'delete_medication':
            $id = (int)($input['id'] ?? 0);
            if ($id > 0) {
                $stmt = $pdo->prepare("DELETE FROM medications WHERE id = ?");
                $stmt->execute([$id]);
            }
            responseJson(['success' => true]);
            break;

        // --- DADOS DE EXEMPLO (DEMONSTRAÇÃO PRÁTICA) ---
        case 'seed_samples':
            // Cria consultas, exames vinculados e remédios reais para ilustrar a logística compartilhada
            // Pega os IDs das pessoas
            $pMap = [];
            $allP = $pdo->query("SELECT id, name FROM persons")->fetchAll();
            foreach ($allP as $p) {
                $pMap[$p['name']] = $p['id'];
            }

            // Data base: hoje + 3 dias
            $dateTrip1 = date('Y-m-d', strtotime('+3 days'));
            $dateTrip2 = date('Y-m-d', strtotime('+10 days'));

            // Limpa dados de exemplo anteriores para não duplicar se clicar mais de uma vez
            $pdo->exec("DELETE FROM exams");
            $pdo->exec("DELETE FROM appointments");
            $pdo->exec("DELETE FROM medications");

            // Consultas e Compromissos nas Cidades da Região (Resende, Cruzeiro, Barreiro, etc.)
            if (isset($pMap['Ednéia'])) {
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Ednéia'], 'Dra. Camila Castro', 'Ginecologia / Rotina', 'Clínica da Mulher', 'Cruzeiro', $dateTrip1, '14:00', 'agendada', 'Levar exames anteriores']);
                $appEdneia = $pdo->lastInsertId();

                // Retorno da Ednéia
                $stmt->execute([$pMap['Ednéia'], 'Dr. Roberto Mendes', 'Cardiologista (Retorno)', 'Hospital São Camilo', 'Cruzeiro', $dateTrip2, '10:30', 'agendada', 'Consulta de retorno para mostrar ecocardiograma']);
                $appRetornoEdneia = $pdo->lastInsertId();

                // Exame da Ednéia para levar no retorno
                $stmtEx = $pdo->prepare("INSERT INTO exams (person_id, exam_name, requested_by_appointment_id, target_appointment_id, exam_date, exam_time, location_name, city, status, result_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmtEx->execute([$pMap['Ednéia'], 'Ecocardiograma com Doppler', null, $appRetornoEdneia, $dateTrip1, '10:00', 'EcoLab', 'Cruzeiro', 'agendado', 'Pegar laudo logo após']);
            }

            if (isset($pMap['Edyr'])) {
                // Edyr tem exame no mesmo dia da Ednéia em Cruzeiro! (Carona perfeita!)
                $stmtEx = $pdo->prepare("INSERT INTO exams (person_id, exam_name, exam_date, exam_time, location_name, city, status, result_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmtEx->execute([$pMap['Edyr'], 'Exame de Sangue em Jejum (Glicemia, Colesterol)', $dateTrip1, '08:30', 'Laboratório Pasteur', 'Cruzeiro', 'agendado', 'Estar em jejum de 10 horas']);

                // Edyr também tem uma consulta agendada
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Edyr'], 'Dr. Fernando Lira', 'Ortopedista', 'Clínica OrtoCenter', 'Cruzeiro', $dateTrip2, '11:15', 'agendada', 'Avaliação do joelho direito']);
            }

            if (isset($pMap['Mãe'])) {
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Mãe'], 'Dr. Marcos Silveira', 'Geriatra', 'Centro Médico Integrado', 'Cruzeiro', $dateTrip1, '15:30', 'agendada', 'Acompanhar com lista de remédios']);
                $appMae = $pdo->lastInsertId();

                // Exame que a mãe precisa fazer
                $stmtEx = $pdo->prepare("INSERT INTO exams (person_id, exam_name, requested_by_appointment_id, status) VALUES (?, ?, ?, ?)");
                $stmtEx->execute([$pMap['Mãe'], 'Densitometria Óssea', $appMae, 'a_agendar']);
            }

            if (isset($pMap['Tia Mariazinha'])) {
                // Compromisso no INSS em Resende
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Tia Mariazinha'], 'Agência INSS', 'INSS - Prova de Vida e Atualização', 'Posto do INSS Centro', 'Resende', $dateTrip1, '10:00', 'agendada', 'Levar documentos e comprovante de endereço']);

                // Remédio da Tia Mariazinha para comprar
                $stmtMed = $pdo->prepare("INSERT INTO medications (person_id, name, dosage, instructions, is_continuous, needs_purchase, preferred_city, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmtMed->execute([$pMap['Tia Mariazinha'], 'Losartana Potássica 50mg', '1 comprimido ao acordar', 'Tomar com água', 1, 1, 'Resende', 'Comprar na Farmácia Popular']);
                $stmtMed->execute([$pMap['Tia Mariazinha'], 'Omeprazol 20mg', '1 cápsula em jejum', 'Uso contínuo', 1, 0, 'Cruzeiro', 'Estoque suficiente para 20 dias']);
            }

            if (isset($pMap['Rogério'])) {
                // Compromisso no Banco em Resende no mesmo dia
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Rogério'], 'Gerente Carlos', 'Banco do Brasil - Saque de Benefício', 'Agência Centro', 'Resende', $dateTrip1, '11:15', 'agendada', 'Aproveitar a mesma ida a Resende']);

                $stmtMed = $pdo->prepare("INSERT INTO medications (person_id, name, dosage, instructions, is_continuous, needs_purchase, preferred_city, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmtMed->execute([$pMap['Rogério'], 'AAS Infantil 100mg', '1 comprimido após almoço', 'Uso contínuo', 1, 1, 'Resende', 'Comprar caixa com 60']);
            }

            if (isset($pMap['Carlos Romeu'])) {
                $stmt = $pdo->prepare("INSERT INTO appointments (person_id, doctor_name, specialty, location_name, city, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pMap['Carlos Romeu'], 'Dr. Arnaldo Dias', 'Oftalmologista', 'Instituto dos Olhos', 'Cruzeiro', $dateTrip2, '09:00', 'agendada', 'Exame de fundo de olho e óculos']);
            }

            responseJson(['success' => true, 'message' => 'Exemplos práticos carregados com sucesso!']);
            break;

        // --- BACKUP / EXPORTAÇÃO ---
        case 'export_backup':
            $backup = [
                'exported_at' => date('Y-m-d H:i:s'),
                'persons' => $pdo->query("SELECT * FROM persons")->fetchAll(),
                'appointments' => $pdo->query("SELECT * FROM appointments")->fetchAll(),
                'exams' => $pdo->query("SELECT * FROM exams")->fetchAll(),
                'medications' => $pdo->query("SELECT * FROM medications")->fetchAll()
            ];
            header('Content-Disposition: attachment; filename="backup_sem_perder_a_data_' . date('Y-m-d') . '.json"');
            echo json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;

        default:
            responseJson(['error' => 'Ação inválida'], 400);
            break;
    }
} catch (Exception $e) {
    responseJson(['error' => $e->getMessage()], 500);
}
