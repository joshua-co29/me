const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const {
    SEVERITY_WEIGHT_MATRIX,
    TRIAGE_THRESHOLDS,
    evaluateDecisionFactor
} = require('./config/matrixWeights');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Supabase Initialization
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wrumedevccqkopguaxdi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_zpd_lzgRqghcN-0X7qw7SA_I2hAZHXH';
let supabase = null;

try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(`[Supabase] Client initialized for: ${SUPABASE_URL}`);
} catch (err) {
    console.warn('[Supabase] Initialization notice:', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Persistent Local Storage (fs-based, auto-persisted to data/database.json)
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Loads the database from disk. If the file is missing or corrupt,
 * a safe empty scaffold is returned so the server still starts.
 */
function loadDb() {
    if (fs.existsSync(DB_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (e) {
            console.error('[DB] Error reading database.json, falling back to empty scaffold:', e.message);
        }
    }

    // Minimal scaffold – the real seed data lives in database.json
    const scaffold = {
        schools:   [],
        classes:   [],
        students:  [],
        users:     [],
        incidents: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(scaffold, null, 2), 'utf8');
    return scaffold;
}

/**
 * Persists the in-memory database back to disk.
 * Called after every write operation (signup, new incident, etc.).
 */
function saveDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// In-memory cache synced directly from Supabase with disk backup
let db = loadDb();

// Load & hydrate all tables directly from Supabase
async function refreshFromSupabase() {
    if (!supabase) return;
    try {
        const [
            { data: schools, error: errSch },
            { data: classes, error: errCls },
            { data: users, error: errUsr },
            { data: students, error: errStu },
            { data: incidents, error: errInc }
        ] = await Promise.all([
            supabase.from('schools').select('*'),
            supabase.from('classes').select('*'),
            supabase.from('users').select('*'),
            supabase.from('students').select('*'),
            supabase.from('incidents').select('*')
        ]);

        if (!errSch && schools) {
            db.schools = schools.map(s => ({
                id: s.id,
                name: s.name,
                type: s.type,
                district: s.district,
                principal: s.principal,
                forms: s.forms || [],
                classes: s.classes || [],
                address: s.address
            }));
        }

        if (!errCls && classes) {
            db.classes = classes.map(c => ({
                id: c.id,
                schoolId: c.school_id,
                label: c.label,
                form: c.form,
                teacherId: c.teacher_id
            }));
        }

        if (!errUsr && users) {
            db.users = users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                schoolId: u.school_id,
                subjects: u.subjects || [],
                assignedClassIds: u.assigned_class_ids || [],
                coversForms: u.covers_forms || [],
                deanCoverage: u.dean_coverage,
                passwordHash: u.password_hash,
                createdAt: u.created_at
            }));
        }

        if (!errStu && students) {
            db.students = students.map(st => ({
                id: st.id,
                studentNumber: st.student_number,
                name: st.name,
                firstName: st.first_name,
                lastName: st.last_name,
                classId: st.class_id,
                schoolId: st.school_id,
                form: st.form,
                incidentCount: st.incident_count || 0,
                triageLevel: st.triage_level || 0,
                attendance: st.attendance || 95,
                status: st.status || 'Active'
            }));
        }

        if (!errInc && incidents) {
            db.incidents = incidents.map(inc => ({
                id: inc.id,
                incidentId: inc.incident_id,
                studentId: inc.student_id,
                studentName: inc.student_name,
                classId: inc.class_id,
                form: inc.form,
                schoolId: inc.school_id,
                school: inc.school,
                district: inc.district,
                matrix: inc.matrix,
                level: parseInt(inc.level || 1),
                action: inc.action,
                description: inc.description,
                status: (inc.status && inc.status.toLowerCase() === 'resolved') ? 'Resolved' :
                        (inc.status && inc.status.toLowerCase() === 'escalated') ? 'Escalated' : 'Open',
                loggedById: inc.logged_by_id,
                loggedBy: inc.logged_by,
                date: inc.date,
                createdAt: inc.created_at
            }));
        }

        saveDb();
        console.log(`[Supabase Live Pull] Hydrated ${db.schools.length} schools, ${db.classes.length} classes, ${db.users.length} users, ${db.students.length} students, ${db.incidents.length} incidents.`);
    } catch (err) {
        console.warn('[Supabase Live Pull] Notice:', err.message);
    }
}

// Initial pull on server boot
refreshFromSupabase();

// Ensure all expected collections exist (backwards-compat guard)
['schools', 'classes', 'students', 'users', 'incidents'].forEach(col => {
    if (!Array.isArray(db[col])) db[col] = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Express Setup
// ─────────────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status:        'online',
        database:      'supabase',
        supabaseUrl:   SUPABASE_URL,
        userCount:     db.users.length,
        incidentCount: db.incidents.length,
        schoolCount:   db.schools.length,
        studentCount:  db.students.length
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4b. DECISION ENGINE & SEVERITY WEIGHTING MATRIX ROUTES (W_level)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/engine/matrix-config', (req, res) => {
    res.json({
        success: true,
        matrix: SEVERITY_WEIGHT_MATRIX,
        thresholds: TRIAGE_THRESHOLDS
    });
});

app.post('/api/engine/evaluate', (req, res) => {
    try {
        const { incidents, studentId } = req.body;
        let incList = [];

        if (Array.isArray(incidents)) {
            incList = incidents;
        } else if (studentId) {
            const cleanId = String(studentId).toLowerCase().trim();
            incList = db.incidents.filter(i =>
                (i.studentId && i.studentId.toLowerCase() === cleanId) ||
                (i.studentName && i.studentName.toLowerCase().includes(cleanId))
            );
        }

        const evaluation = evaluateDecisionFactor(incList);
        res.json({
            success: true,
            evaluation
        });
    } catch (err) {
        res.status(500).json({ error: 'Evaluation failed: ' + err.message });
    }
});

app.get('/api/engine/students-evaluation', (req, res) => {
    try {
        const evaluations = db.students.map(st => {
            const sName = (st.name || '').toLowerCase();
            const sId = (st.studentNumber || st.id || '').toLowerCase();
            const studentIncs = db.incidents.filter(i => {
                const incStuId = (i.studentId || '').toLowerCase();
                const incStudent = (i.studentName || i.student || '').toLowerCase();
                return (incStuId && (incStuId === sId || incStuId === st.id.toLowerCase())) ||
                       (incStudent && sName && (incStudent.includes(sName) || sName.includes(incStudent)));
            });

            const evalResult = evaluateDecisionFactor(studentIncs);
            return {
                studentId: st.id,
                studentNumber: st.studentNumber || st.id,
                name: st.name,
                form: st.form,
                school: st.school || 'Port of Spain North Secondary',
                schoolId: st.schoolId,
                district: st.district || 'St. George East District',
                status: st.status || 'Active',
                currentTriageLevel: st.triageLevel || 0,
                incidentCount: studentIncs.length,
                evaluation: evalResult
            };
        });

        // Sort descending by decision factor risk score
        evaluations.sort((a, b) => b.evaluation.score - a.evaluation.score);

        res.json({
            success: true,
            totalStudents: evaluations.length,
            evaluations
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to evaluate students: ' + err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── Login ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Please provide your Name/Email and Password.' });
        }

        const cleanIdent = identifier.toLowerCase().trim();

        // Match by email (exact), name (exact / includes), or role
        const user = db.users.find(u =>
            u.email.toLowerCase() === cleanIdent ||
            u.name.toLowerCase()  === cleanIdent ||
            u.name.toLowerCase().includes(cleanIdent) ||
            u.role.toLowerCase()  === cleanIdent ||
            u.role.toLowerCase().includes(cleanIdent)
        );

        if (!user) {
            return res.status(401).json({ error: 'No account found matching that name or email.' });
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
        }

        // Resolve school name if schoolId is present
        let schoolName = null;
        if (user.schoolId) {
            const school = db.schools.find(s => s.id === user.schoolId);
            if (school) schoolName = school.name;
        }

        console.log(`[Login] ${user.name} (${user.role}) ✓`);

        res.json({
            success: true,
            user: {
                id:               user.id,
                name:             user.name,
                email:            user.email,
                role:             user.role,
                schoolId:         user.schoolId        || null,
                schoolName:       schoolName,
                assignedClassIds: user.assignedClassIds || [],
                coversForms:      user.coversForms      || [],
                deanCoverage:     user.deanCoverage     || null,
                subjects:         user.subjects         || []
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login error: ' + err.message });
    }
});

// ── Sign Up ────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, role, schoolId } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        const exists = db.users.find(u => u.email.toLowerCase() === cleanEmail);
        if (exists) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            id:               'usr_' + Date.now(),
            name:             name.trim(),
            email:            cleanEmail,
            role:             role || 'Staff Member',
            schoolId:         schoolId || null,
            assignedClassIds: [],
            coversForms:      [],
            deanCoverage:     null,
            subjects:         [],
            passwordHash,
            createdAt:        new Date().toISOString()
        };

        db.users.push(newUser);
        saveDb();

        // Optional Supabase sync
        if (supabase) {
            supabase.from('users').upsert({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                school_id: newUser.schoolId || null,
                password_hash: passwordHash,
                created_at: newUser.createdAt
            }).then(({ error }) => {
                if (error) console.warn('[Supabase Sync] Users sync notice:', error.message);
            }).catch(err =>
                console.warn('[Supabase Sync] Users sync error:', err.message)
            );
        }

        console.log(`[Signup] ${newUser.name} (${newUser.email}) - ${newUser.role}`);

        // Resolve school name for response
        let schoolName = null;
        if (newUser.schoolId) {
            const school = db.schools.find(s => s.id === newUser.schoolId);
            if (school) schoolName = school.name;
        }

        res.status(201).json({
            success: true,
            user: {
                id:         newUser.id,
                name:       newUser.name,
                email:      newUser.email,
                role:       newUser.role,
                schoolId:   newUser.schoolId,
                schoolName: schoolName
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Signup failed: ' + err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. INCIDENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET all incidents (Ministry / Principal overview)
app.get('/api/incidents', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
            if (!error && Array.isArray(data)) {
                db.incidents = data.map(inc => ({
                    id: inc.id,
                    incidentId: inc.incident_id,
                    studentId: inc.student_id,
                    studentName: inc.student_name,
                    classId: inc.class_id,
                    form: inc.form,
                    schoolId: inc.school_id,
                    school: inc.school,
                    district: inc.district,
                    matrix: inc.matrix,
                    level: parseInt(inc.level || 1),
                    action: inc.action,
                    description: inc.description,
                    status: (inc.status && inc.status.toLowerCase() === 'resolved') ? 'Resolved' :
                            (inc.status && inc.status.toLowerCase() === 'escalated') ? 'Escalated' : 'Open',
                    loggedById: inc.logged_by_id,
                    loggedBy: inc.logged_by,
                    date: inc.date,
                    createdAt: inc.created_at
                }));
                saveDb();
            }
        } catch (err) {
            console.warn('[Supabase Live Incidents Pull Notice]:', err.message);
        }
    }

    const enriched = (db.incidents || []).map(inc => {
        const sch = (db.schools || []).find(s => s.id === inc.schoolId);
        return {
            ...inc,
            school: inc.school || (sch ? sch.name : 'Port of Spain North Secondary'),
            district: inc.district || (sch ? sch.district : 'St. George East District')
        };
    });
    res.json(enriched);
});

// GET incidents logged by a specific teacher
app.get('/api/incidents/by-teacher/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const results = db.incidents.filter(i => i.loggedById === teacherId);
    res.json(results);
});

// GET all incidents for a school
app.get('/api/incidents/by-school/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const results = db.incidents.filter(i => i.schoolId === schoolId);
    res.json(results);
});

// GET incidents for a specific class
app.get('/api/incidents/by-class/:classId', (req, res) => {
    const { classId } = req.params;
    const results = db.incidents.filter(i => i.classId === classId);
    res.json(results);
});

// POST /api/incidents/by-forms – incidents for specific forms at a school
// (Uses POST so forms[] array can be sent in the request body)
app.post('/api/incidents/by-forms', (req, res) => {
    const { schoolId, forms } = req.body;

    if (!schoolId || !Array.isArray(forms) || forms.length === 0) {
        return res.status(400).json({ error: 'schoolId and a non-empty forms array are required.' });
    }

    const results = db.incidents.filter(i =>
        i.schoolId === schoolId && forms.includes(i.form)
    );
    res.json(results);
});

// POST – log a new incident
app.post('/api/incidents', async (req, res) => {
    try {
        const {
            studentName, student, studentId, classId, form, schoolId, school,
            district, matrix, level, action, description, loggedById, loggedBy,
            status, incidentId
        } = req.body;

        const resolvedName   = studentName || student;
        const resolvedClass  = classId     || 'General';
        const resolvedSchool = schoolId    || 'sch_001';
        const resolvedLogger = loggedById  || 'usr_ministry_01';

        if (!resolvedName) {
            return res.status(400).json({
                error: 'Student name is required.'
            });
        }

        const rawStatus = (status || 'Open').trim();
        const normStatus = rawStatus.toLowerCase() === 'resolved' ? 'Resolved' :
                           rawStatus.toLowerCase() === 'escalated' ? 'Escalated' : 'Open';

        const newInc = {
            id:         'inc_' + Date.now(),
            incidentId: incidentId || `#INC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            studentId:  studentId   || null,
            studentName: resolvedName,
            classId:     resolvedClass,
            form:        form       || '',
            schoolId:    resolvedSchool,
            school:      school     || '',
            district:    district   || '',
            matrix:      matrix     || 'Level 1 Matrix',
            level:       parseInt(level || (matrix && matrix.includes('3') ? 3 : matrix && matrix.includes('2') ? 2 : 1)),
            action:      action     || 'Under Review',
            description: description || '',
            status:      normStatus,
            loggedById:  resolvedLogger,
            loggedBy:    loggedBy   || 'Staff Member',
            date:        new Date().toLocaleDateString('en-TT', {
                             month: 'short', day: 'numeric', year: 'numeric'
                         }),
            createdAt:   new Date().toISOString()
        };

        // Match student in students collection if exists to update incident count and triage level
        const cleanName = resolvedName.toLowerCase();
        const stu = db.students.find(s =>
            (newInc.studentId && (s.id === newInc.studentId || s.studentNumber === newInc.studentId)) ||
            (s.name && (s.name.toLowerCase() === cleanName || cleanName.includes(s.name.toLowerCase())))
        );

        if (stu) {
            newInc.studentId = stu.id;
            newInc.studentName = stu.name;
            if (!newInc.schoolId && stu.schoolId) newInc.schoolId = stu.schoolId;
            if (!newInc.form && stu.form) newInc.form = stu.form;
            if (!newInc.classId && stu.classId) newInc.classId = stu.classId;

            stu.incidentCount = (stu.incidentCount || 0) + 1;
            if (stu.incidentCount >= 6)      stu.triageLevel = 3;
            else if (stu.incidentCount >= 4) stu.triageLevel = 2;
            else if (stu.incidentCount >= 2) stu.triageLevel = 1;
            else                             stu.triageLevel = 0;

            if (supabase) {
                try {
                    await supabase.from('students').update({
                        incident_count: stu.incidentCount,
                        triage_level: stu.triageLevel
                    }).eq('id', stu.id);
                } catch (sErr) {
                    console.warn('[Supabase Sync] Student count sync notice:', sErr.message);
                }
            }
        }

        db.incidents.unshift(newInc);
        saveDb();

        // Push to online Supabase database
        if (supabase) {
            try {
                const { error: sbErr } = await supabase.from('incidents').upsert({
                    id: newInc.id,
                    incident_id: newInc.incidentId,
                    student_id: newInc.studentId || null,
                    student_name: newInc.studentName,
                    class_id: newInc.classId || null,
                    form: newInc.form || null,
                    school_id: newInc.schoolId || null,
                    school: newInc.school || null,
                    district: newInc.district || null,
                    matrix: newInc.matrix || null,
                    level: parseInt(newInc.level || 1),
                    action: newInc.action || null,
                    description: newInc.description || null,
                    status: newInc.status,
                    logged_by_id: newInc.loggedById || null,
                    logged_by: newInc.loggedBy || null,
                    date: newInc.date || null
                });
                if (sbErr) console.warn('[Supabase Sync] Incident upsert notice:', sbErr.message);
                else console.log(`[Supabase Sync] Incident ${newInc.incidentId} upserted to online Supabase database ✓`);
            } catch (err) {
                console.warn('[Supabase Sync] Incident upsert error:', err.message);
            }
        }

        console.log(`[Incident] ${newInc.incidentId} logged for ${newInc.studentName} by ${newInc.loggedBy} -> status: ${newInc.status}`);
        res.status(201).json({ success: true, incident: newInc });
    } catch (err) {
        console.error('Log incident error:', err);
        res.status(500).json({ error: 'Failed to log incident: ' + err.message });
    }
});

// UPDATE an existing incident (PUT /api/incidents/:id)
app.put('/api/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const idx = db.incidents.findIndex(i => i.id === id || i.incidentId === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const existing = db.incidents[idx];

        // Allowed updatable fields
        if (updates.status !== undefined) {
            const raw = (updates.status || '').trim().toLowerCase();
            existing.status = raw === 'resolved' ? 'Resolved' :
                              raw === 'escalated' ? 'Escalated' : 'Open';
        }
        if (updates.action !== undefined) existing.action = updates.action;
        if (updates.description !== undefined) existing.description = updates.description;
        if (updates.matrix !== undefined) existing.matrix = updates.matrix;
        if (updates.level !== undefined) existing.level = parseInt(updates.level) || existing.level;
        if (updates.school !== undefined) existing.school = updates.school;
        if (updates.district !== undefined) existing.district = updates.district;
        if (updates.studentName !== undefined) existing.studentName = updates.studentName;
        if (updates.form !== undefined) existing.form = updates.form;
        existing.updatedAt = new Date().toISOString();

        saveDb();

        // Sync update to Supabase
        if (supabase) {
            try {
                const { error: sErr } = await supabase.from('incidents').update({
                    status: existing.status,
                    action: existing.action,
                    description: existing.description,
                    matrix: existing.matrix,
                    level: parseInt(existing.level || 1),
                    school: existing.school,
                    district: existing.district,
                    student_name: existing.studentName,
                    form: existing.form
                }).eq('id', existing.id);
                if (sErr) console.warn('[Supabase Update] Error syncing to Supabase:', sErr.message);
                else console.log(`[Supabase Update] Incident ${existing.incidentId} updated in online Supabase database ✓`);
            } catch (sErr) {
                console.warn('[Supabase Update] Error syncing to Supabase:', sErr.message);
            }
        }

        console.log(`[Incident] Updated incident ${existing.incidentId} (${existing.id}) -> status: ${existing.status}`);
        res.json({ success: true, incident: existing });
    } catch (err) {
        console.error('Update incident error:', err);
        res.status(500).json({ error: 'Failed to update incident: ' + err.message });
    }
});

// DELETE an incident (DELETE /api/incidents/:id)
app.delete('/api/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const idx = db.incidents.findIndex(i => i.id === id || i.incidentId === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const removed = db.incidents.splice(idx, 1)[0];
        saveDb();

        // Delete from Supabase
        if (supabase) {
            try {
                const { error: sErr } = await supabase.from('incidents')
                    .delete()
                    .eq('id', removed.id);
                if (sErr) console.warn('[Supabase Delete] Error deleting from Supabase:', sErr.message);
                else console.log(`[Supabase Delete] Incident ${removed.incidentId} deleted from online Supabase database ✓`);
            } catch (sErr) {
                console.warn('[Supabase Delete] Error deleting from Supabase:', sErr.message);
            }
        }

        console.log(`[Incident] Deleted incident ${removed.incidentId} (${removed.id})`);
        res.json({ success: true, message: 'Incident successfully deleted', incident: removed });
    } catch (err) {
        console.error('Delete incident error:', err);
        res.status(500).json({ error: 'Failed to delete incident: ' + err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SCHOOL ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET all schools
app.get('/api/schools', (req, res) => {
    res.json(db.schools);
});

// GET one school with classes and teachers populated
app.get('/api/schools/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const school = db.schools.find(s => s.id === schoolId);

    if (!school) {
        return res.status(404).json({ error: 'School not found.' });
    }

    // Populate classes for this school
    const classes = db.classes
        .filter(c => c.schoolId === schoolId)
        .map(c => {
            const teacher = db.users.find(u => u.id === c.teacherId);
            return {
                ...c,
                teacher: teacher
                    ? { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects || [] }
                    : null
            };
        });

    // Populate teachers (all users assigned to this school)
    const staff = db.users
        .filter(u => u.schoolId === schoolId)
        .map(({ passwordHash, ...safe }) => safe);  // omit password hash

    res.json({ ...school, classes, staff });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. CLASS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET all classes for a school (with teacher info)
app.get('/api/classes/by-school/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const classes = db.classes
        .filter(c => c.schoolId === schoolId)
        .map(c => {
            const teacher = db.users.find(u => u.id === c.teacherId);
            return {
                ...c,
                teacher: teacher
                    ? { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects || [] }
                    : null
            };
        });
    res.json(classes);
});

// GET all classes assigned to a teacher (via assignedClassIds)
app.get('/api/classes/by-teacher/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const teacher = db.users.find(u => u.id === teacherId);

    if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found.' });
    }

    const assignedIds = teacher.assignedClassIds || [];
    const classes = db.classes.filter(c => assignedIds.includes(c.id));
    res.json(classes);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. STUDENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET all students (Ministry overview)
app.get('/api/students', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('students').select('*').order('name');
            if (!error && Array.isArray(data)) {
                db.students = data.map(st => ({
                    id: st.id,
                    studentNumber: st.student_number,
                    name: st.name,
                    firstName: st.first_name,
                    lastName: st.last_name,
                    classId: st.class_id,
                    schoolId: st.school_id,
                    form: st.form,
                    incidentCount: st.incident_count || 0,
                    triageLevel: st.triage_level || 0,
                    attendance: st.attendance || 95,
                    status: st.status || 'Active'
                }));
                saveDb();
            }
        } catch (err) {
            console.warn('[Supabase Live Students Pull Notice]:', err.message);
        }
    }

    const enriched = (db.students || []).map(stu => {
        const sch = (db.schools || []).find(s => s.id === stu.schoolId);
        return {
            ...stu,
            studentId: stu.studentId || stu.id,
            school: stu.school || (sch ? sch.name : 'Port of Spain North Secondary'),
            district: stu.district || (sch ? sch.district : 'St. George East District')
        };
    });
    res.json(enriched);
});

// GET all students in a class
app.get('/api/students/by-class/:classId', (req, res) => {
    const { classId } = req.params;
    const students = db.students.filter(s => s.classId === classId);
    res.json(students);
});

// GET all students in a school
app.get('/api/students/by-school/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const students = db.students.filter(s => s.schoolId === schoolId);
    res.json(students);
});

// UPDATE a student file (PUT /api/students/:id)
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const idx = db.students.findIndex(s => s.id === id || s.studentId === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Student file not found' });
        }

        const student = db.students[idx];
        if (updates.name !== undefined) student.name = updates.name;
        if (updates.form !== undefined) student.form = updates.form;
        if (updates.school !== undefined) student.school = updates.school;
        if (updates.district !== undefined) student.district = updates.district;
        if (updates.triageLevel !== undefined) student.triageLevel = parseInt(updates.triageLevel);
        if (updates.incidentCount !== undefined) student.incidentCount = parseInt(updates.incidentCount);
        if (updates.lastReview !== undefined) student.lastReview = updates.lastReview;
        student.updatedAt = new Date().toISOString();

        saveDb();

        if (supabase) {
            try {
                const { error: sErr } = await supabase.from('students').update({
                    name: student.name,
                    form: student.form,
                    school: student.school,
                    district: student.district,
                    triage_level: student.triageLevel,
                    incident_count: student.incidentCount
                }).eq('id', student.id);
                if (sErr) console.warn('[Supabase Student Update] Sync notice:', sErr.message);
                else console.log(`[Supabase Student Update] Updated ${student.name} in online database ✓`);
            } catch (sErr) {
                console.warn('[Supabase Student Update] Sync notice:', sErr.message);
            }
        }

        console.log(`[Student] Updated file for ${student.name} (${student.id})`);
        res.json({ success: true, student });
    } catch (err) {
        console.error('Update student error:', err);
        res.status(500).json({ error: 'Failed to update student: ' + err.message });
    }
});

// DELETE a student file (DELETE /api/students/:id)
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const idx = db.students.findIndex(s => s.id === id || s.studentId === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Student file not found' });
        }

        const removed = db.students.splice(idx, 1)[0];
        saveDb();

        if (supabase) {
            try {
                const { error: sErr } = await supabase.from('students')
                    .delete()
                    .eq('id', removed.id);
                if (sErr) console.warn('[Supabase Student Delete] Notice:', sErr.message);
                else console.log(`[Supabase Student Delete] Deleted ${removed.name} from online database ✓`);
            } catch (sErr) {
                console.warn('[Supabase Student Delete] Notice:', sErr.message);
            }
        }

        console.log(`[Student] Deleted student file ${removed.name} (${removed.id})`);
        res.json({ success: true, message: 'Student file deleted', student: removed });
    } catch (err) {
        console.error('Delete student error:', err);
        res.status(500).json({ error: 'Failed to delete student: ' + err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. STAFF ROUTE
// ─────────────────────────────────────────────────────────────────────────────

// GET all staff (Teachers, Deans, Counselors, Principals) for a school
app.get('/api/staff/by-school/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const staffRoles = ['Teacher', 'Dean of Discipline', 'Guidance Counselor', 'Principal'];

    const staff = db.users
        .filter(u => u.schoolId === schoolId && staffRoles.includes(u.role))
        .map(({ passwordHash, ...safe }) => safe);  // omit password hash

    res.json(staff);
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. STATS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Helper – compute level counts for a given incident array
function computeLevelCounts(incidents) {
    let open = 0, resolved = 0, escalated = 0;
    let level1 = 0, level2 = 0, level3 = 0;

    (incidents || []).forEach(inc => {
        const status = (inc.status || '').toLowerCase().trim();
        if (status === 'resolved')       resolved++;
        else if (status === 'escalated') escalated++;
        else                             open++;

        const m = (inc.matrix || '').toLowerCase();
        const lvl = parseInt(inc.level);
        if      (lvl === 3 || m.includes('level 3') || m.includes('severe')) level3++;
        else if (lvl === 2 || m.includes('level 2') || m.includes('moderate')) level2++;
        else if (lvl === 1 || m.includes('level 1') || m.includes('minor')) level1++;
        else level1++;
    });

    return { open, resolved, escalated, level1, level2, level3 };
}

// GET national stats (Ministry view)
app.get('/api/stats', async (req, res) => {
    if (supabase) {
        try {
            const [
                { data: liveInc, error: errInc },
                { data: liveStu, error: errStu }
            ] = await Promise.all([
                supabase.from('incidents').select('*'),
                supabase.from('students').select('*')
            ]);

            if (!errInc && Array.isArray(liveInc)) {
                db.incidents = liveInc.map(inc => ({
                    id: inc.id,
                    incidentId: inc.incident_id,
                    studentId: inc.student_id,
                    studentName: inc.student_name,
                    classId: inc.class_id,
                    form: inc.form,
                    schoolId: inc.school_id,
                    school: inc.school,
                    district: inc.district,
                    matrix: inc.matrix,
                    level: parseInt(inc.level || 1),
                    action: inc.action,
                    description: inc.description,
                    status: (inc.status && inc.status.toLowerCase() === 'resolved') ? 'Resolved' :
                            (inc.status && inc.status.toLowerCase() === 'escalated') ? 'Escalated' : 'Open',
                    loggedById: inc.logged_by_id,
                    loggedBy: inc.logged_by,
                    date: inc.date,
                    createdAt: inc.created_at
                }));
            }
            if (!errStu && Array.isArray(liveStu)) {
                db.students = liveStu.map(st => ({
                    id: st.id,
                    studentNumber: st.student_number,
                    name: st.name,
                    firstName: st.first_name,
                    lastName: st.last_name,
                    classId: st.class_id,
                    schoolId: st.school_id,
                    form: st.form,
                    incidentCount: st.incident_count || 0,
                    triageLevel: st.triage_level || 0,
                    attendance: st.attendance || 95,
                    status: st.status || 'Active'
                }));
            }
            saveDb();
        } catch (e) {
            console.warn('[Supabase Stats Live Sync]:', e.message);
        }
    }

    const counts = computeLevelCounts(db.incidents);
    const activeStudents = db.students.filter(s => (s.status || 'Active').toLowerCase() === 'active').length || db.students.length;
    const triage3Count = db.students.filter(s => parseInt(s.triageLevel) === 3).length;

    res.json({
        totalIncidents:  db.incidents.length,
        openCases:       counts.open,
        resolvedCases:   counts.resolved,
        escalatedCases:  counts.escalated,
        level3Count:     counts.level3,
        levelCounts: {
            level1: counts.level1,
            level2: counts.level2,
            level3: counts.level3
        },
        schoolCount:     db.schools.length,
        studentCount:    db.students.length,
        activeStudents:  activeStudents,
        triage3Students: triage3Count
    });
});

// Force refresh all tables directly from Supabase online database
app.get('/api/sync/pull', async (req, res) => {
    try {
        await refreshFromSupabase();
        res.json({
            success: true,
            message: 'All tables successfully refreshed from online Supabase database',
            counts: {
                schools: db.schools.length,
                classes: db.classes.length,
                users: db.users.length,
                students: db.students.length,
                incidents: db.incidents.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET school-level stats
app.get('/api/stats/school/:schoolId', (req, res) => {
    const { schoolId } = req.params;
    const school = db.schools.find(s => s.id === schoolId);

    if (!school) {
        return res.status(404).json({ error: 'School not found.' });
    }

    const schoolIncidents = db.incidents.filter(i => i.schoolId === schoolId);
    const schoolStudents  = db.students.filter(s => s.schoolId === schoolId);
    const schoolStaff     = db.users.filter(u => u.schoolId === schoolId);
    const counts          = computeLevelCounts(schoolIncidents);

    // Students at each triage level
    const triage = { 0: 0, 1: 0, 2: 0, 3: 0 };
    schoolStudents.forEach(s => { triage[s.triageLevel] = (triage[s.triageLevel] || 0) + 1; });

    res.json({
        schoolId,
        schoolName:     school.name,
        district:       school.district,
        totalIncidents: schoolIncidents.length,
        openCases:      counts.open,
        resolvedCases:  counts.resolved,
        escalatedCases: counts.escalated,
        level3Count:    counts.level3,
        levelCounts: {
            level1: counts.level1,
            level2: counts.level2,
            level3: counts.level3
        },
        studentCount:   schoolStudents.length,
        staffCount:     schoolStaff.length,
        triageLevels:   triage
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Fallback – serve index.html for the root (SPA support)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Start Server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('=======================================================');
    console.log(` Sentinel Edu Server is LIVE on port ${PORT}`);
    console.log(` Open:     http://localhost:${PORT}`);
    console.log(` Database: Supabase (wrumedevccqkopguaxdi.supabase.co)`);
    console.log(` Schools:  ${db.schools.length}  |  Users: ${db.users.length}  |  Incidents: ${db.incidents.length}`);
    console.log('=======================================================');
});
