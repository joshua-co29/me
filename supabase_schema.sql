-- =============================================================================
-- Sentinel Edu Database Schema for Supabase
-- Paste and run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wrumedevccqkopguaxdi/sql/new
-- =============================================================================

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
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

-- 2. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    form TEXT NOT NULL,
    teacher_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT,
    subjects JSONB DEFAULT '[]'::jsonb,
    assigned_class_ids JSONB DEFAULT '[]'::jsonb,
    covers_forms JSONB DEFAULT '[]'::jsonb,
    dean_coverage TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    student_number TEXT,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    class_id TEXT,
    school_id TEXT,
    form TEXT,
    incident_count INT DEFAULT 0,
    triage_level INT DEFAULT 0,
    attendance INT DEFAULT 95,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    incident_id TEXT,
    student_id TEXT,
    student_name TEXT NOT NULL,
    class_id TEXT,
    form TEXT,
    school_id TEXT,
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

-- Enable Row Level Security (RLS) & Allow public anon access for demo/testing
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Development policies (allow all read/write via anon publishable key)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon all on schools" ON public.schools;
    CREATE POLICY "Allow anon all on schools" ON public.schools FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on classes" ON public.classes;
    CREATE POLICY "Allow anon all on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
    CREATE POLICY "Allow anon all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on students" ON public.students;
    CREATE POLICY "Allow anon all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on incidents" ON public.incidents;
    CREATE POLICY "Allow anon all on incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);
END $$;

