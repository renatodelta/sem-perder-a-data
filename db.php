<?php
// db.php - Conexão e inicialização do banco de dados SQLite para "Sem Perder a Data"

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

// Cria proteção para que o arquivo sqlite não seja baixado diretamente via web
$htaccessFile = $dataDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    file_put_contents($htaccessFile, "Deny from all\n");
}

$dbPath = $dataDir . '/sem_perder_a_data.sqlite';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Habilita chaves estrangeiras
    $pdo->exec('PRAGMA foreign_keys = ON;');

    // Tabela de Pessoas (Familiares e Ednéia)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            relation TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#3b82f6',
            avatar_icon TEXT DEFAULT 'user',
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // Tabela de Consultas Médicas
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            doctor_name TEXT,
            specialty TEXT NOT NULL,
            location_name TEXT,
            city TEXT NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME,
            status TEXT DEFAULT 'agendada', -- agendada, realizada, cancelada
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
        );
    ");

    // Tabela de Exames
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            exam_name TEXT NOT NULL,
            requested_by_appointment_id INTEGER, -- Consulta que pediu
            target_appointment_id INTEGER,       -- Consulta onde DEVE ser levado o resultado
            exam_date DATE,                      -- Data de realização
            exam_time TIME,
            location_name TEXT,                  -- Laboratório/Clínica
            city TEXT,
            status TEXT DEFAULT 'a_agendar',     -- a_agendar, agendado, feito_aguardando, pronto_levar, concluido
            result_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            FOREIGN KEY (requested_by_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
            FOREIGN KEY (target_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
        );
    ");

    // Tabela de Remédios / Farmácia
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT,
            instructions TEXT,                   -- '1x ao dia pela manhã', etc.
            is_continuous INTEGER DEFAULT 1,     -- 1 para uso contínuo, 0 para temporário
            needs_purchase INTEGER DEFAULT 0,    -- 1 se precisa comprar / providenciar
            preferred_city TEXT,                 -- Cidade onde costuma comprar ou pegar
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
        );
    ");

    // Insere os 6 familiares pré-definidos se a tabela de pessoas estiver vazia
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM persons");
    $total = $stmt->fetch()['total'];

    if ($total == 0) {
        $initialPersons = [
            ['Ednéia', '', '#8b5cf6', 'heart-pulse', 'Ednéia'],
            ['Mãe', '', '#ec4899', 'user-heart', 'Mãe'],
            ['Edyr', '', '#2563eb', 'user', 'Edyr'],
            ['Carlos Romeu', '', '#059669', 'user', 'Carlos Romeu'],
            ['Rogério', '', '#ea580c', 'user', 'Rogério'],
            ['Tia Mariazinha', '', '#0891b2', 'user', 'Tia Mariazinha']
        ];

        $insertStmt = $pdo->prepare("
            INSERT INTO persons (name, relation, color, avatar_icon, notes)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($initialPersons as $p) {
            $insertStmt->execute($p);
        }
    }

} catch (PDOException $e) {
    die("Erro ao conectar ou criar banco SQLite: " . $e->getMessage());
}
