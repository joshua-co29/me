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
    gpa NUMERIC(3,2) DEFAULT 3.00,
    course_failures INT DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2) DEFAULT 3.00;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS course_failures INT DEFAULT 0;

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

-- 6. Guidance & SSSD Clinical Interventions Table
CREATE TABLE IF NOT EXISTS public.interventions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    school_id TEXT,
    school TEXT,
    type TEXT NOT NULL,
    counselor_name TEXT,
    risk_score_at_entry INT DEFAULT 0,
    target_risk_score INT DEFAULT 0,
    outcome TEXT DEFAULT 'In Progress',
    notes TEXT,
    follow_up_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Triage Scores Table (Longitudinal ABC + PBIS Risk Snapshots)
CREATE TABLE IF NOT EXISTS public.triage_scores (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT,
    school_id TEXT,
    month_label TEXT NOT NULL,
    attendance_rate INT DEFAULT 95,
    gpa NUMERIC(3,2) DEFAULT 3.00,
    course_failures INT DEFAULT 0,
    incident_points NUMERIC(5,1) DEFAULT 0.0,
    pbis_offset NUMERIC(5,1) DEFAULT 0.0,
    risk_score INT NOT NULL,
    tier TEXT DEFAULT 'Tier 1: Healthy',
    is_escalating BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PBIS Rewards Audit Log Table (Anti-Points Inflation & Category Caps)
CREATE TABLE IF NOT EXISTS public.pbis_rewards (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    school_id TEXT,
    category TEXT NOT NULL,
    points INT NOT NULL CHECK (points > 0 AND points <= 25),
    monthly_cap INT DEFAULT 50,
    awarded_by_id TEXT,
    awarded_by_name TEXT NOT NULL,
    awarded_by_role TEXT DEFAULT 'Teacher',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Student Concerns & Voice Table (Anonymous Student Submissions)
CREATE TABLE IF NOT EXISTS public.student_concerns (
    id TEXT PRIMARY KEY,
    school_id TEXT,
    school TEXT,
    category TEXT NOT NULL,
    concern_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT true,
    student_id TEXT,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Allow public anon access for demo/testing
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbis_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_concerns ENABLE ROW LEVEL SECURITY;

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

    DROP POLICY IF EXISTS "Allow anon all on interventions" ON public.interventions;
    CREATE POLICY "Allow anon all on interventions" ON public.interventions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on triage_scores" ON public.triage_scores;
    CREATE POLICY "Allow anon all on triage_scores" ON public.triage_scores FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on pbis_rewards" ON public.pbis_rewards;
    CREATE POLICY "Allow anon all on pbis_rewards" ON public.pbis_rewards FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon all on student_concerns" ON public.student_concerns;
    CREATE POLICY "Allow anon all on student_concerns" ON public.student_concerns FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Ensure dynamic incident point weighting column exists
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS weight INTEGER;

-- 10. Database Cleanup: Remove hardcoded/synthetic test students & test incidents
DELETE FROM public.triage_scores WHERE student_id IN ('stu_test_01', 'stu_1794342607079');
DELETE FROM public.pbis_rewards WHERE student_id IN ('stu_test_01', 'stu_1794342607079');
DELETE FROM public.student_concerns WHERE student_id IN ('stu_test_01', 'stu_1794342607079');
DELETE FROM public.incidents
WHERE id LIKE 'inc_test_%'
   OR student_id IN ('stu_test_01', 'stu_1794342607079')
   OR LOWER(COALESCE(student_name, '')) IN ('test student', 'automated test student', 'test', 'rarar')
   OR LOWER(COALESCE(description, '')) LIKE '%auditor bot%';
DELETE FROM public.students
WHERE id IN ('stu_test_01', 'stu_1794342607079')
   OR LOWER(COALESCE(name, '')) IN ('test student', 'test', 'automated test student');


