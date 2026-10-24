-- Schema SQL para Cloudflare D1 (SQLite) - Sem Perder a Data

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

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    doctor_name TEXT,
    specialty TEXT NOT NULL,
    location_name TEXT,
    city TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    status TEXT DEFAULT 'agendada',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    exam_name TEXT NOT NULL,
    requested_by_appointment_id INTEGER,
    target_appointment_id INTEGER,
    exam_date DATE,
    exam_time TIME,
    location_name TEXT,
    city TEXT,
    status TEXT DEFAULT 'a_agendar',
    result_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (target_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    instructions TEXT,
    is_continuous INTEGER DEFAULT 1,
    needs_purchase INTEGER DEFAULT 0,
    preferred_city TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

-- Carga inicial dos 6 familiares (apenas os nomes)
INSERT INTO persons (name, relation, color, avatar_icon, notes) VALUES
('Ednéia', '', '#8b5cf6', 'heart-pulse', 'Ednéia'),
('Mãe', '', '#ec4899', 'user-heart', 'Mãe'),
('Edyr', '', '#2563eb', 'user', 'Edyr'),
('Carlos Romeu', '', '#059669', 'user', 'Carlos Romeu'),
('Rogério', '', '#ea580c', 'user', 'Rogério'),
('Tia Mariazinha', '', '#0891b2', 'user', 'Tia Mariazinha');

