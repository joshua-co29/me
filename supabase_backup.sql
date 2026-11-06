-- ================================================================
-- SENTINEL EDU - SUPABASE MASTER DATABASE RESTORATION SCRIPT (SQL)
-- Generated At: 2026-11-05T19:34:50.051Z
-- Target Supabase URL: https://wrumedevccqkopguaxdi.supabase.co
-- Use this file to repopulate or recreate the online database anytime.
-- Paste and run directly in the Supabase SQL Editor.
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- 1. TABLE STRUCTURES & PERMISSIONS (DDL)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'secondary',
    district TEXT,
    principal TEXT,
    forms JSONB DEFAULT '[]'::jsonb,
    classes JSONB DEFAULT '[]'::jsonb,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    form TEXT,
    teacher_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    subjects JSONB DEFAULT '[]'::jsonb,
    assigned_class_ids JSONB DEFAULT '[]'::jsonb,
    covers_forms JSONB DEFAULT '[]'::jsonb,
    dean_coverage TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    student_number TEXT,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    class_id TEXT,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    form TEXT,
    incident_count INT DEFAULT 0,
    triage_level INT DEFAULT 0,
    attendance NUMERIC DEFAULT 95,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    incident_id TEXT,
    student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
    student_name TEXT,
    class_id TEXT,
    form TEXT,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    school TEXT,
    district TEXT,
    matrix TEXT,
    level INT DEFAULT 1,
    action TEXT,
    description TEXT,
    status TEXT DEFAULT 'Open',
    logged_by_id TEXT,
    logged_by TEXT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public anonymous read/write policies for web application
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public All Schools" ON schools;
    CREATE POLICY "Public All Schools" ON schools FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public All Classes" ON classes;
    CREATE POLICY "Public All Classes" ON classes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public All Users" ON users;
    CREATE POLICY "Public All Users" ON users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public All Students" ON students;
    CREATE POLICY "Public All Students" ON students FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public All Incidents" ON incidents;
    CREATE POLICY "Public All Incidents" ON incidents FOR ALL USING (true) WITH CHECK (true);
END
$$;

-- ─────────────────────────────────────────────────────────────────
-- 2. SEED DATA: SCHOOLS (3 rows)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO schools (id, name, type, district, principal, forms, classes, address)
VALUES ('sch_001', 'Port of Spain North Secondary', 'secondary', 'St. George East District', 'usr_principal_01', '["Form 1","Form 2","Form 3","Form 4","Form 5","Lower 6","Upper 6"]'::jsonb, '["1A","1B","1C","2A","2B","2C","3A","3B","3C","3D","4A","4B","4C","5A","5B","5C","L6A","U6A"]'::jsonb, '12 Independence Square, Port of Spain')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    district = EXCLUDED.district,
    principal = EXCLUDED.principal,
    forms = EXCLUDED.forms,
    classes = EXCLUDED.classes,
    address = EXCLUDED.address;

INSERT INTO schools (id, name, type, district, principal, forms, classes, address)
VALUES ('sch_002', 'San Fernando East Technical', 'secondary', 'Victoria Educational District', 'usr_principal_02', '["Form 1","Form 2","Form 3","Form 4","Form 5","Lower 6","Upper 6"]'::jsonb, '["1A","1B","2A","2B","3A","3B","4A","4B","5A","5B","L6A"]'::jsonb, '45 High Street, San Fernando')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    district = EXCLUDED.district,
    principal = EXCLUDED.principal,
    forms = EXCLUDED.forms,
    classes = EXCLUDED.classes,
    address = EXCLUDED.address;

INSERT INTO schools (id, name, type, district, principal, forms, classes, address)
VALUES ('sch_003', 'Arima Anglican Primary', 'primary', 'St. George East District', 'usr_principal_03', '["Standard 1","Standard 2","Standard 3","Standard 4","Standard 5"]'::jsonb, '["Std1A","Std1B","Std2A","Std2B","Std3A","Std3B","Std4A","Std4B","Std5A","Std5B"]'::jsonb, '7 Church Street, Arima')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    district = EXCLUDED.district,
    principal = EXCLUDED.principal,
    forms = EXCLUDED.forms,
    classes = EXCLUDED.classes,
    address = EXCLUDED.address;

-- ─────────────────────────────────────────────────────────────────
-- 3. SEED DATA: CLASSES (30 rows)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_1A', 'sch_001', 'Form 1A', 'Form 1', 'usr_teacher_01')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_1B', 'sch_001', 'Form 1B', 'Form 1', 'usr_teacher_02')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_1C', 'sch_001', 'Form 1C', 'Form 1', 'usr_teacher_03')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_2A', 'sch_001', 'Form 2A', 'Form 2', 'usr_teacher_04')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_2B', 'sch_001', 'Form 2B', 'Form 2', 'usr_teacher_04')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_2C', 'sch_001', 'Form 2C', 'Form 2', 'usr_teacher_02')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_3A', 'sch_001', 'Form 3A', 'Form 3', 'usr_teacher_05')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_3B', 'sch_001', 'Form 3B', 'Form 3', 'usr_teacher_03')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_3C', 'sch_001', 'Form 3C', 'Form 3', 'usr_teacher_04')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_3D', 'sch_001', 'Form 3D', 'Form 3', 'usr_teacher_05')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_4A', 'sch_001', 'Form 4A', 'Form 4', 'usr_teacher_05')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_4B', 'sch_001', 'Form 4B', 'Form 4', 'usr_teacher_05')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_4C', 'sch_001', 'Form 4C', 'Form 4', 'usr_teacher_03')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_5A', 'sch_001', 'Form 5A', 'Form 5', 'usr_teacher_02')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_5B', 'sch_001', 'Form 5B', 'Form 5', 'usr_teacher_04')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_5C', 'sch_001', 'Form 5C', 'Form 5', 'usr_teacher_05')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_dummy_01', 'sch_001', 'Form 2A (Sample Class)', 'Form 2', 'usr_teacher_01')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_L6A', 'sch_001', 'Lower 6A', 'Lower 6', 'usr_teacher_02')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_p1A', 'sch_003', 'Std 1A', 'Standard 1', 'usr_teacher_08')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_p2A', 'sch_003', 'Std 2A', 'Standard 2', 'usr_teacher_08')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_p3A', 'sch_003', 'Std 3A', 'Standard 3', 'usr_teacher_09')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_p4A', 'sch_003', 'Std 4A', 'Standard 4', 'usr_teacher_09')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_p5A', 'sch_003', 'Std 5A', 'Standard 5', 'usr_teacher_08')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf1A', 'sch_002', 'Form 1A', 'Form 1', 'usr_teacher_06')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf1B', 'sch_002', 'Form 1B', 'Form 1', 'usr_teacher_07')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf2A', 'sch_002', 'Form 2A', 'Form 2', 'usr_teacher_06')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf3A', 'sch_002', 'Form 3A', 'Form 3', 'usr_teacher_07')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf4A', 'sch_002', 'Form 4A', 'Form 4', 'usr_teacher_06')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_sf5A', 'sch_002', 'Form 5A', 'Form 5', 'usr_teacher_07')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES ('cls_U6A', 'sch_001', 'Upper 6A', 'Upper 6', 'usr_teacher_03')
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;

-- ─────────────────────────────────────────────────────────────────
-- 4. SEED DATA: USERS (16 rows)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_counselor_01', 'Ms. Tricia Boodoo', 't.boodoo@posns.edu.tt', 'Guidance Counselor', 'sch_001', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_dean_01', 'Mr. Roland Mohammed', 'r.mohammed@posns.edu.tt', 'Dean of Discipline', 'sch_001', '[]'::jsonb, '[]'::jsonb, '["Form 1","Form 2","Form 3","Form 4","Form 5","Lower 6","Upper 6"]'::jsonb, 'All Forms', '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_dean_02', 'Mrs. Sandra Alleyne', 's.alleyne@posns.edu.tt', 'Dean of Discipline', 'sch_001', '[]'::jsonb, '[]'::jsonb, '["Form 1","Form 2","Form 3","Form 4","Form 5","Lower 6","Upper 6"]'::jsonb, 'All Forms', '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_ministry_01', 'Dr. Shirley Ramjattan', 's.ramjattan@moe.gov.tt', 'Ministry Education Officer', NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_principal_01', 'Mr. Glen Fitzwilliam', 'g.fitzwilliam@posns.edu.tt', 'Principal', 'sch_001', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_principal_02', 'Mrs. Carol Hosein', 'c.hosein@sfet.edu.tt', 'Principal', 'sch_002', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_principal_03', 'Ms. Anita Paul', 'a.paul@aapc.edu.tt', 'Principal', 'sch_003', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_01', 'Ms. Sarah Ali', 's.ali@posns.edu.tt', 'Teacher', 'sch_001', '["Mathematics","Additional Mathematics"]'::jsonb, '["cls_1A","cls_dummy_01"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_02', 'Mr. Kevin Ramsaran', 'k.ramsaran@posns.edu.tt', 'Teacher', 'sch_001', '["English Language","Literature in English"]'::jsonb, '["cls_1B","cls_2C","cls_5A","cls_L6A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_03', 'Mrs. Diana Noel', 'd.noel@posns.edu.tt', 'Teacher', 'sch_001', '["Biology","Integrated Science"]'::jsonb, '["cls_1C","cls_3B","cls_4C","cls_U6A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_04', 'Mr. Joel Hercules', 'j.hercules@posns.edu.tt', 'Teacher', 'sch_001', '["Social Studies","History"]'::jsonb, '["cls_2B","cls_3C","cls_5B"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_05', 'Ms. Paula Ramkhelawan', 'p.ramkhelawan@posns.edu.tt', 'Teacher', 'sch_001', '["Physical Education","Health Education"]'::jsonb, '["cls_3A","cls_3D","cls_4B","cls_5C"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_06', 'Mr. Carlos Reyes', 'c.reyes@sfet.edu.tt', 'Teacher', 'sch_002', '["Technical Drawing","Industrial Technology"]'::jsonb, '["cls_sf1A","cls_sf2A","cls_sf4A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_07', 'Ms. Yvonne Francis', 'y.francis@sfet.edu.tt', 'Teacher', 'sch_002', '["Mathematics","Physics"]'::jsonb, '["cls_sf1B","cls_sf3A","cls_sf5A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_08', 'Ms. June Rampersad', 'j.rampersad@aapc.edu.tt', 'Teacher', 'sch_003', '["Language Arts","Mathematics"]'::jsonb, '["cls_p1A","cls_p2A","cls_p5A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES ('usr_teacher_09', 'Mr. Leon Beepath', 'l.beepath@aapc.edu.tt', 'Teacher', 'sch_003', '["Science","Social Studies"]'::jsonb, '["cls_p3A","cls_p4A"]'::jsonb, '[]'::jsonb, NULL, '$2a$10$.OKJUggMQaOcTAoAj4ANAOqg/48li712RQUrl9Q2GbWq8mmO4mBLO')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;

-- ─────────────────────────────────────────────────────────────────
-- 5. SEED DATA: STUDENTS (38 rows)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_001', NULL, 'Kayla Ramkissoon', NULL, NULL, 'cls_1A', 'sch_001', 'Form 1', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_002', NULL, 'Marcus Williams', NULL, NULL, 'cls_1B', 'sch_001', 'Form 1', 0, 0, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_003', NULL, 'Priya Seepersad', NULL, NULL, 'cls_2A', 'sch_001', 'Form 2', 2, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_004', NULL, 'Jordan Baptiste', NULL, NULL, 'cls_2B', 'sch_001', 'Form 2', 0, 0, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_005', NULL, 'Aiden Mohammed', NULL, NULL, 'cls_3A', 'sch_001', 'Form 3', 3, 2, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_006', NULL, 'Destiny Charles', NULL, NULL, 'cls_3B', 'sch_001', 'Form 3', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_007', NULL, 'Tyler Persad', NULL, NULL, 'cls_3D', 'sch_001', 'Form 3', 4, 2, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_008', NULL, 'Alicia Ramsundar', NULL, NULL, 'cls_4A', 'sch_001', 'Form 4', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_009', NULL, 'Darian Joseph', NULL, NULL, 'cls_4B', 'sch_001', 'Form 4', 5, 3, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_010', NULL, 'Nadia Ramoutar', NULL, NULL, 'cls_5A', 'sch_001', 'Form 5', 0, 0, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_011', NULL, 'Keshan Singh', NULL, NULL, 'cls_5C', 'sch_001', 'Form 5', 6, 3, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_012', NULL, 'Simone Alexis', NULL, NULL, 'cls_L6A', 'sch_001', 'Lower 6', 0, 0, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_013', NULL, 'Andre Garcia', NULL, NULL, 'cls_sf1A', 'sch_002', 'Form 1', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_014', NULL, 'Tamara Singh', NULL, NULL, 'cls_sf3A', 'sch_002', 'Form 3', 2, 2, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_015', NULL, 'Joel Hernandez', NULL, NULL, 'cls_sf5A', 'sch_002', 'Form 5', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_016', NULL, 'Rachel Phillip', NULL, NULL, 'cls_p3A', 'sch_003', 'Standard 3', 1, 1, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_017', NULL, 'Devon Castillo', NULL, NULL, 'cls_p5A', 'sch_003', 'Standard 5', 3, 2, 95, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_101', 'POS-2024-003', 'Liam De Silva', NULL, NULL, 'cls_1A', 'sch_001', 'Form 1', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_102', 'POS-2024-004', 'Zaria Maharaj', NULL, NULL, 'cls_1A', 'sch_001', 'Form 1', 1, 1, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_103', 'POS-2024-005', 'Christian Roberts', NULL, NULL, 'cls_1A', 'sch_001', 'Form 1', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_104', 'POS-2024-006', 'Gabriella Hernandez', NULL, NULL, 'cls_1A', 'sch_001', 'Form 1', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_105', 'POS-2023-019', 'Ethan Look Hong', NULL, NULL, 'cls_2A', 'sch_001', 'Form 2', 1, 1, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_106', 'POS-2023-020', 'Maya Baldeo', NULL, NULL, 'cls_2A', 'sch_001', 'Form 2', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_107', 'POS-2023-021', 'Kaelan Chung', NULL, NULL, 'cls_2A', 'sch_001', 'Form 2', 2, 1, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_108', 'POS-2023-022', 'Tia-Marie Joseph', NULL, NULL, 'cls_2A', 'sch_001', 'Form 2', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_109', 'POS-2021-013', 'Josiah Pierre', NULL, NULL, 'cls_4A', 'sch_001', 'Form 4', 2, 2, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_110', 'POS-2021-014', 'Chantel Superville', NULL, NULL, 'cls_4A', 'sch_001', 'Form 4', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_111', 'POS-2021-015', 'Ronaldo Baboolal', NULL, NULL, 'cls_4A', 'sch_001', 'Form 4', 3, 2, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_112', 'POS-2021-016', 'Sheriece Gomez', NULL, NULL, 'cls_4A', 'sch_001', 'Form 4', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_113', 'POS-2024-007', 'Daniel Mitchell', NULL, NULL, 'cls_1B', 'sch_001', 'Form 1', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_114', 'POS-2024-008', 'Sita Lutchman', NULL, NULL, 'cls_1B', 'sch_001', 'Form 1', 1, 1, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_115', 'POS-2022-032', 'Nigel Campbell', NULL, NULL, 'cls_3A', 'sch_001', 'Form 3', 1, 1, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_116', 'POS-2022-033', 'Anisa Maraj', NULL, NULL, 'cls_3A', 'sch_001', 'Form 3', 0, 0, 95, 'active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_dummy_01', 'STU-2026-901', 'Kavita Ramoutar', 'Kavita', 'Ramoutar', 'cls_dummy_01', 'sch_001', 'Form 2', 1, 1, 94, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_dummy_02', 'STU-2026-902', 'Marcus Pierre', 'Marcus', 'Pierre', 'cls_dummy_01', 'sch_001', 'Form 2', 2, 2, 88, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_dummy_03', 'STU-2026-903', 'Aaliyah Mohammed', 'Aaliyah', 'Mohammed', 'cls_dummy_01', 'sch_001', 'Form 2', 0, 0, 98, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_dummy_04', 'STU-2026-904', 'Devon Seepersad', 'Devon', 'Seepersad', 'cls_dummy_01', 'sch_001', 'Form 2', 1, 1, 91, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES ('stu_dummy_05', 'STU-2026-905', 'Shania Campbell', 'Shania', 'Campbell', 'cls_dummy_01', 'sch_001', 'Form 2', 0, 0, 96, 'Active')
ON CONFLICT (id) DO UPDATE SET
    student_number = EXCLUDED.student_number,
    name = EXCLUDED.name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    class_id = EXCLUDED.class_id,
    school_id = EXCLUDED.school_id,
    form = EXCLUDED.form,
    incident_count = EXCLUDED.incident_count,
    triage_level = EXCLUDED.triage_level,
    attendance = EXCLUDED.attendance,
    status = EXCLUDED.status;

-- ─────────────────────────────────────────────────────────────────
-- 6. SEED DATA: INCIDENTS (22 rows)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793676359942', '#INC-2026-369', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '2 Nov 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793676332622', '#INC-2026-748', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '2 Nov 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793676051317', '#INC-2026-344', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '2 Nov 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793253713711', '#INC-2026-988', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '29 Oct 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793252940770', '#INC-2026-844', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '29 Oct 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793252883715', '#INC-2026-621', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '29 Oct 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793252515314', '#INC-2026-843', NULL, 'Automated Test Student', 'cls_1A', 'Form 1', 'sch_001', NULL, NULL, 'Disruptive Behaviour', 1, 'Automated test warning', 'Test incident generated by auditor bot', 'open', 'usr_teacher_01', 'Ms. Sarah Ali', '29 Oct 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_089', '#INC-2026-089', 'stu_009', 'Darian Joseph', 'cls_4B', 'Form 4', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 2 Matrix', 1, 'Dean Formal Review', 'Persistent disruptive behaviour during physical education class.', 'Open', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 27, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_088', '#INC-2026-088', 'stu_003', 'Priya Seepersad', 'cls_2A', 'Form 2', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 1 Matrix', 1, 'Guidance Counseling Referral', 'Missed three consecutive mathematics classes without explanation.', 'Resolved', 'usr_teacher_01', 'Ms. Sarah Ali', 'Oct 26, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_085', '#INC-2026-085', 'stu_011', 'Keshan Singh', 'cls_5C', 'Form 5', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 3 Matrix', 1, 'Ministry Escalated Review', 'Violent altercation with another student during lunch break.', 'Escalated', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 25, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_081', '#INC-2026-081', 'stu_007', 'Tyler Persad', 'cls_3D', 'Form 3', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 2 Matrix', 1, 'Parent Conference Logged', 'Repeated insubordination and refusal to follow classroom instructions.', 'Open', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 24, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_079', '#INC-2026-079', 'stu_001', 'Kayla Ramkissoon', 'cls_1A', 'Form 1', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 1 Matrix', 1, 'Peer Mediation Protocol', 'Verbal conflict between student and classmate over seating arrangement.', 'Resolved', 'usr_teacher_01', 'Ms. Sarah Ali', 'Oct 23, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_074', '#INC-2026-074', 'stu_014', 'Tamara Singh', 'cls_sf3A', 'Form 3', 'sch_002', 'San Fernando East Technical', 'Victoria Educational District', 'Level 3 Matrix', 1, 'External Support Assigned', 'Student found with prohibited items in school bag during bag check.', 'Escalated', 'usr_teacher_07', 'Ms. Yvonne Francis', 'Oct 22, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_070', '#INC-2026-070', 'stu_005', 'Aiden Mohammed', 'cls_3A', 'Form 3', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 2 Matrix', 1, 'Dean Formal Review', 'Student left school grounds without permission during school hours.', 'Open', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 20, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_066', '#INC-2026-066', 'stu_013', 'Andre Garcia', 'cls_sf1A', 'Form 1', 'sch_002', 'San Fernando East Technical', 'Victoria Educational District', 'Level 1 Matrix', 1, 'Guidance Counseling Referral', 'Difficulty adjusting to secondary school routines; counseling recommended.', 'Resolved', 'usr_teacher_06', 'Mr. Carlos Reyes', 'Oct 19, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_060', '#INC-2026-060', 'stu_016', 'Rachel Phillip', 'cls_p3A', 'Standard 3', 'sch_003', 'Arima Anglican Primary', 'St. George East District', 'Level 1 Matrix', 1, 'Peer Mediation Protocol', 'Bullying incident involving student taking another''s lunch.', 'Resolved', 'usr_teacher_09', 'Mr. Leon Beepath', 'Oct 18, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_057', '#INC-2026-057', 'stu_009', 'Darian Joseph', 'cls_4B', 'Form 4', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 3 Matrix', 1, 'Ministry Escalated Review', 'Student threatened a teacher. Immediate escalation to Ministry required.', 'Escalated', 'usr_teacher_01', 'Ms. Sarah Ali', 'Oct 15, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_053', '#INC-2026-053', 'stu_005', 'Aiden Mohammed', 'cls_3A', 'Form 3', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 1 Matrix', 1, 'Guidance Counseling Referral', 'Student showing signs of withdrawal and disengagement in class.', 'Resolved', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 12, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_048', '#INC-2026-048', 'stu_017', 'Devon Castillo', 'cls_p5A', 'Standard 5', 'sch_003', 'Arima Anglican Primary', 'St. George East District', 'Level 2 Matrix', 1, 'Parent Conference Logged', 'Persistent truancy and late arrival. Parent meeting scheduled.', 'Open', 'usr_teacher_08', 'Ms. June Rampersad', 'Oct 10, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_044', '#INC-2026-044', 'stu_015', 'Joel Hernandez', 'cls_sf5A', 'Form 5', 'sch_002', 'San Fernando East Technical', 'Victoria Educational District', 'Level 1 Matrix', 1, 'Peer Mediation Protocol', 'Argument between two students over assignment submission.', 'Resolved', 'usr_teacher_07', 'Ms. Yvonne Francis', 'Oct 08, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_040', '#INC-2026-040', 'stu_011', 'Keshan Singh', 'cls_5C', 'Form 5', 'sch_001', 'Port of Spain North Secondary', 'St. George East District', 'Level 2 Matrix', 1, 'Dean Formal Review', 'Second major conduct violation this term. Referred to Upper Dean.', 'Open', 'usr_teacher_05', 'Ms. Paula Ramkhelawan', 'Oct 05, 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES ('inc_1793906503154', '#INC-2026-747', NULL, 'rarar', 'hgkhbkhb', 'hgkhbkhb', 'sch_001', 'Ministry of Education (National View)', 'St. George East District', 'Level 2 Matrix', 2, 'Peer Mediation Protocol', 'srdgfuj', 'Open', 'usr_ministry_01', 'Dr. Shirley Ramjattan', '5 Nov 2026')
ON CONFLICT (id) DO UPDATE SET
    incident_id = EXCLUDED.incident_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    class_id = EXCLUDED.class_id,
    form = EXCLUDED.form,
    school_id = EXCLUDED.school_id,
    school = EXCLUDED.school,
    district = EXCLUDED.district,
    matrix = EXCLUDED.matrix,
    level = EXCLUDED.level,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    logged_by_id = EXCLUDED.logged_by_id,
    logged_by = EXCLUDED.logged_by,
    date = EXCLUDED.date;

