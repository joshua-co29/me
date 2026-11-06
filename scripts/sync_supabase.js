const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wrumedevccqkopguaxdi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_zpd_lzgRqghcN-0X7qw7SA_I2hAZHXH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncAll() {
  console.log('Reading data/database.json...');
  const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

  // 1. Sync Schools
  if (db.schools && db.schools.length) {
    console.log(`Syncing ${db.schools.length} schools...`);
    const formatted = db.schools.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type || 'secondary',
      district: s.district || null,
      principal: s.principal || null,
      forms: s.forms || [],
      classes: s.classes || [],
      address: s.address || null
    }));
    const { error } = await supabase.from('schools').upsert(formatted);
    if (error) console.error('Error syncing schools:', error.message);
    else console.log('✓ Schools synced');
  }

  // 2. Sync Classes
  if (db.classes && db.classes.length) {
    console.log(`Syncing ${db.classes.length} classes...`);
    const formatted = db.classes.map(c => ({
      id: c.id,
      school_id: c.schoolId || null,
      label: c.label,
      form: c.form,
      teacher_id: c.teacherId || null
    }));
    const { error } = await supabase.from('classes').upsert(formatted);
    if (error) console.error('Error syncing classes:', error.message);
    else console.log('✓ Classes synced');
  }

  // 3. Sync Users
  if (db.users && db.users.length) {
    console.log(`Syncing ${db.users.length} users...`);
    const formatted = db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      school_id: u.schoolId || null,
      subjects: u.subjects || [],
      assigned_class_ids: u.assignedClassIds || [],
      covers_forms: u.coversForms || [],
      dean_coverage: u.deanCoverage || null,
      password_hash: u.passwordHash || null
    }));
    const { error } = await supabase.from('users').upsert(formatted);
    if (error) console.error('Error syncing users:', error.message);
    else console.log('✓ Users synced');
  }

  // 4. Sync Students
  if (db.students && db.students.length) {
    console.log(`Syncing ${db.students.length} students...`);
    const formatted = db.students.map(st => ({
      id: st.id,
      student_number: st.studentNumber || null,
      name: st.name,
      first_name: st.firstName || null,
      last_name: st.lastName || null,
      class_id: st.classId || null,
      school_id: st.schoolId || null,
      form: st.form || null,
      incident_count: st.incidentCount || 0,
      triage_level: st.triageLevel || 0,
      attendance: st.attendance || 95,
      status: st.status || 'Active'
    }));
    const { error } = await supabase.from('students').upsert(formatted);
    if (error) console.error('Error syncing students:', error.message);
    else console.log('✓ Students synced');
  }

  // 5. Sync Incidents
  if (db.incidents && db.incidents.length) {
    console.log(`Syncing ${db.incidents.length} incidents...`);
    const formatted = db.incidents.map(inc => ({
      id: inc.id,
      incident_id: inc.incidentId || null,
      student_id: inc.studentId || null,
      student_name: inc.studentName || inc.student || 'Unknown',
      class_id: inc.classId || null,
      form: inc.form || null,
      school_id: inc.schoolId || null,
      school: inc.school || null,
      district: inc.district || null,
      matrix: inc.matrix || null,
      level: parseInt(inc.level || 1),
      action: inc.action || null,
      description: inc.description || null,
      status: inc.status || 'Open',
      logged_by_id: inc.loggedById || null,
      logged_by: inc.loggedBy || null,
      date: inc.date || null
    }));
    const { error } = await supabase.from('incidents').upsert(formatted);
    if (error) console.error('Error syncing incidents:', error.message);
    else console.log('✓ Incidents synced');
  }

  console.log('Sync process completed.');
}

syncAll().catch(console.error);

