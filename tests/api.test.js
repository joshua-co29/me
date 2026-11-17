const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;
let serverProc = null;

async function waitForServer(url, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`${url}/api/health`);
            if (res.ok) return await res.json();
        } catch (_) {}
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

test.before(async () => {
    serverProc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: 'ignore'
    });
    await waitForServer(BASE_URL);
});

test.after(() => {
    if (serverProc && !serverProc.killed) {
        serverProc.kill('SIGTERM');
    }
});

test('1. Health Check (GET /api/health)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'online');
    assert.ok(typeof body.studentCount === 'number');
});

test('2. Incident Logging Black-Box & RBAC (POST /api/incidents + DELETE cleanup)', async () => {
    // 2a. Missing studentName -> 400 Bad Request
    const badRes = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 1, description: 'Missing student name' })
    });
    assert.equal(badRes.status, 400);

    // 2b. RBAC: Teacher attempting to log Level 3 -> 403 Forbidden
    const rbacRes = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentName: 'Test Student',
            level: 3,
            loggedByRole: 'Teacher'
        })
    });
    assert.equal(rbacRes.status, 403);

    // 2c. Valid incident logging -> 201 Created, then cleanup via DELETE
    const okRes = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentName: 'Integration Test Student',
            schoolId: 'sch_001',
            level: 2,
            loggedByRole: 'Dean of Discipline',
            description: 'API integration test incident'
        })
    });
    assert.equal(okRes.status, 201);
    const created = await okRes.json();
    const createdId = created.id || (created.incident && created.incident.id);
    assert.ok(createdId, 'Expected created incident ID');

    const delRes = await fetch(`${BASE_URL}/api/incidents/${createdId}`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);
});

test('3. Bulk Attendance Ingestion (POST /api/attendance/bulk)', async () => {
    // 3a. Missing logs array -> 400
    const badRes = await fetch(`${BASE_URL}/api/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 'stu_001' })
    });
    assert.equal(badRes.status, 400);

    // 3b. Valid bulk attendance payload -> 201
    const okRes = await fetch(`${BASE_URL}/api/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: 'stu_test_bulk',
            logs: [
                {
                    id: 'att_test_1',
                    studentId: 'stu_test_bulk',
                    date: '2026-11-17',
                    status: 'Present',
                    period: 'Full Day'
                },
                {
                    id: 'att_test_2',
                    studentId: 'stu_test_bulk',
                    date: '2026-11-18',
                    status: 'Absent',
                    period: 'Full Day'
                }
            ]
        })
    });
    assert.equal(okRes.status, 201);
    const body = await okRes.json();
    assert.equal(body.success, true);
    assert.equal(body.count, 2);
});

test('4. Batch Decision Factor Evaluation (GET /api/engine/students-evaluation)', async () => {
    const res = await fetch(`${BASE_URL}/api/engine/students-evaluation`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.evaluations));
    if (body.evaluations.length >= 2) {
        assert.ok(
            body.evaluations[0].evaluation.score >= body.evaluations[1].evaluation.score,
            'Expected evaluations sorted descending by risk score'
        );
    }
});

test('5. Live SSE Dashboard Stream (GET /api/events receives connected + live mutation push)', async () => {
    const controller = new AbortController();
    const res = await fetch(`${BASE_URL}/api/events`, { signal: controller.signal });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/event-stream/);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Read initial "event: connected"
    while (!buffer.includes('event: connected')) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
    }
    assert.match(buffer, /event: connected/);

    // Trigger a live mutation (bulk attendance) and verify SSE pushes "attendance_logs"
    await fetch(`${BASE_URL}/api/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: 'stu_sse_test',
            logs: [{ id: 'att_sse_1', studentId: 'stu_sse_test', date: '2026-11-17', status: 'Present' }]
        })
    });

    while (!buffer.includes('attendance_logs')) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
    }
    assert.match(buffer, /attendance_logs/);
    controller.abort();
});
