const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wrumedevccqkopguaxdi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_zpd_lzgRqghcN-0X7qw7SA_I2hAZHXH';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportSql() {
  console.log('Fetching all collections from online Supabase...');
  const [sch, cls, usr, stu, inc] = await Promise.all([
    supabase.from('schools').select('*').order('id', { ascending: true }),
    supabase.from('classes').select('*').order('id', { ascending: true }),
    supabase.from('users').select('*').order('id', { ascending: true }),
    supabase.from('students').select('*').order('id', { ascending: true }),
    supabase.from('incidents').select('*').order('created_at', { ascending: true })
  ]);

  if (sch.error) throw new Error('Schools fetch error: ' + sch.error.message);
  if (cls.error) throw new Error('Classes fetch error: ' + cls.error.message);
  if (usr.error) throw new Error('Users fetch error: ' + usr.error.message);
  if (stu.error) throw new Error('Students fetch error: ' + stu.error.message);
  if (inc.error) throw new Error('Incidents fetch error: ' + inc.error.message);

  console.log(`Retrieved: ${sch.data.length} schools, ${cls.data.length} classes, ${usr.data.length} users, ${stu.data.length} students, ${inc.data.length} incidents.`);

  let sql = '';
  sql += '-- ================================================================\n';
  sql += '-- SENTINEL EDU - SUPABASE MASTER DATABASE RESTORATION SCRIPT (SQL)\n';
  sql += '-- Generated At: ' + new Date().toISOString() + '\n';
  sql += '-- Target Supabase URL: ' + SUPABASE_URL + '\n';
  sql += '-- Use this file to repopulate or recreate the online database anytime.\n';
  sql += '-- Paste and run directly in the Supabase SQL Editor.\n';
  sql += '-- ================================================================\n\n';

  // 1. DDL Statements
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += '-- 1. TABLE STRUCTURES & PERMISSIONS (DDL)\n';
  sql += '-- ─────────────────────────────────────────────────────────────────\n\n';

  sql += `CREATE TABLE IF NOT EXISTS schools (
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
\n`;

  // 2. Schools Data
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += `-- 2. SEED DATA: SCHOOLS (${sch.data.length} rows)\n`;
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  for (const s of sch.data) {
    sql += `INSERT INTO schools (id, name, type, district, principal, forms, classes, address)
VALUES (${esc(s.id)}, ${esc(s.name)}, ${esc(s.type)}, ${esc(s.district)}, ${esc(s.principal)}, ${esc(s.forms)}, ${esc(s.classes)}, ${esc(s.address)})
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    district = EXCLUDED.district,
    principal = EXCLUDED.principal,
    forms = EXCLUDED.forms,
    classes = EXCLUDED.classes,
    address = EXCLUDED.address;\n\n`;
  }

  // 3. Classes Data
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += `-- 3. SEED DATA: CLASSES (${cls.data.length} rows)\n`;
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  for (const c of cls.data) {
    sql += `INSERT INTO classes (id, school_id, label, form, teacher_id)
VALUES (${esc(c.id)}, ${esc(c.school_id)}, ${esc(c.label)}, ${esc(c.form)}, ${esc(c.teacher_id)})
ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    label = EXCLUDED.label,
    form = EXCLUDED.form,
    teacher_id = EXCLUDED.teacher_id;\n\n`;
  }

  // 4. Users Data
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += `-- 4. SEED DATA: USERS (${usr.data.length} rows)\n`;
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  for (const u of usr.data) {
    sql += `INSERT INTO users (id, name, email, role, school_id, subjects, assigned_class_ids, covers_forms, dean_coverage, password_hash)
VALUES (${esc(u.id)}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.role)}, ${esc(u.school_id)}, ${esc(u.subjects)}, ${esc(u.assigned_class_ids)}, ${esc(u.covers_forms)}, ${esc(u.dean_coverage)}, ${esc(u.password_hash)})
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    subjects = EXCLUDED.subjects,
    assigned_class_ids = EXCLUDED.assigned_class_ids,
    covers_forms = EXCLUDED.covers_forms,
    dean_coverage = EXCLUDED.dean_coverage,
    password_hash = EXCLUDED.password_hash;\n\n`;
  }

  // 5. Students Data
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += `-- 5. SEED DATA: STUDENTS (${stu.data.length} rows)\n`;
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  for (const st of stu.data) {
    sql += `INSERT INTO students (id, student_number, name, first_name, last_name, class_id, school_id, form, incident_count, triage_level, attendance, status)
VALUES (${esc(st.id)}, ${esc(st.student_number)}, ${esc(st.name)}, ${esc(st.first_name)}, ${esc(st.last_name)}, ${esc(st.class_id)}, ${esc(st.school_id)}, ${esc(st.form)}, ${esc(st.incident_count)}, ${esc(st.triage_level)}, ${esc(st.attendance)}, ${esc(st.status)})
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
    status = EXCLUDED.status;\n\n`;
  }

  // 6. Incidents Data
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  sql += `-- 6. SEED DATA: INCIDENTS (${inc.data.length} rows)\n`;
  sql += '-- ─────────────────────────────────────────────────────────────────\n';
  for (const i of inc.data) {
    sql += `INSERT INTO incidents (id, incident_id, student_id, student_name, class_id, form, school_id, school, district, matrix, level, action, description, status, logged_by_id, logged_by, date)
VALUES (${esc(i.id)}, ${esc(i.incident_id)}, ${esc(i.student_id)}, ${esc(i.student_name)}, ${esc(i.class_id)}, ${esc(i.form)}, ${esc(i.school_id)}, ${esc(i.school)}, ${esc(i.district)}, ${esc(i.matrix)}, ${esc(i.level)}, ${esc(i.action)}, ${esc(i.description)}, ${esc(i.status)}, ${esc(i.logged_by_id)}, ${esc(i.logged_by)}, ${esc(i.date)})
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
    date = EXCLUDED.date;\n\n`;
  }

  const outPath = path.join(__dirname, '..', 'supabase_backup.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`✓ Backup successfully generated at: ${outPath} (${sql.length} bytes, ${(sql.length / 1024).toFixed(1)} KB)`);
}

exportSql().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});

