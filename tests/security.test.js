const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PORT = 5056;
const BASE_URL = `http://localhost:${PORT}`;
let serverProc = null;

async function waitForServer(url, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`${url}/api/health`);
            if (res.ok) return;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`Server did not start within ${timeoutMs}ms`);
}

test.before(async () => {
    serverProc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        env: { ...process.env, PORT: String(PORT) },
        stdio: 'ignore'
    });
    await waitForServer(BASE_URL);
});

test.after(() => {
    if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
});

test('1. Login Validation: Missing fields -> 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 's.ali@posns.edu.tt' }) // missing password
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /provide your Name\/Email and Password/i);
});

test('2. SQL Injection Protection: SQL syntax in email field -> 400 Bad Request (Server & Client)', async () => {
    const payloads = [
        "' OR '1'='1",
        "s.ali@posns.edu.tt'; DROP TABLE users;--",
        "admin@moe.gov.tt UNION SELECT * FROM users"
    ];

    for (const payload of payloads) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: payload, password: 'demo1234' })
        });
        assert.equal(res.status, 400, `Expected 400 for SQLi payload: ${payload}`);
        const body = await res.json();
        assert.match(body.error, /SQL syntax|special characters/i);
    }

    // Also verify client-side performLogin() in auth.js rejects SQLi before sending
    const authCode = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
    const sandbox = {
        window: {},
        document: { readyState: 'complete', addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        fetch, AbortController, setTimeout, clearTimeout, console
    };
    vm.runInNewContext(authCode, sandbox);
    await assert.rejects(
        () => sandbox.performLogin("' OR 1=1 --", 'demo1234'),
        /SQL syntax|special characters/i
    );
});

test('3. Non-Existent Account -> 401 "There is no account with this email."', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: 'nobody.here@moe.edu.tt',
            password: 'SomePassword123!'
        })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'There is no account with this email.');
});

test('4. Correct Email + Wrong Password -> 401 "Invalid password..."', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: 's.ali@posns.edu.tt',
            password: 'DefinitelyWrongPassword!'
        })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Invalid password/i);
});

test('5. Incident Form Validation & RBAC: Missing studentName -> 400; Teacher Level 3-5 -> 403', async () => {
    const missingRes = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 1 })
    });
    assert.equal(missingRes.status, 400);

    const rbacRes = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentName: 'Test Student',
            level: 4,
            loggedByRole: 'Teacher'
        })
    });
    assert.equal(rbacRes.status, 403);
    const rbacBody = await rbacRes.json();
    assert.match(rbacBody.error, /RBAC Restriction/i);
});

test('6. PBIS Max Points Constraint (>25 pts rejected in DB DDL & Frontend Cap)', () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'supabase_schema.sql'), 'utf8');
    assert.match(schemaSql, /CHECK\s*\(\s*points\s*>\s*0\s+AND\s+points\s*<=\s*25\s*\)/i);
    assert.match(schemaSql, /monthly_cap\s+INT\s+DEFAULT\s+50/i);

    const pbisHtml = fs.readFileSync(path.join(__dirname, '..', 'participation-points.html'), 'utf8');
    assert.match(pbisHtml, /const categoryCap = PBIS_CATEGORY_CAPS\[reason\] \|\| 25;/);
    assert.match(pbisHtml, /if\s*\(\s*amount\s*>\s*categoryCap\s*\)/);
});

test('7. Role-Restricted Routing & Navigation across all 5 roles (auth.js)', () => {
    const authCode = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
    const sandbox = {
        window: {},
        document: { readyState: 'complete', addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        console
    };
    vm.runInNewContext(authCode, sandbox);

    const roles = [
        { role: 'Teacher', expectedDash: 'teacher-dashboard.html', forbiddenNav: ['engine.html', 'schools.html'] },
        { role: 'Dean of Discipline', expectedDash: 'dean-dashboard.html', forbiddenNav: ['schools.html', 'teachers.html'] },
        { role: 'Guidance Counselor', expectedDash: 'counselor-dashboard.html', forbiddenNav: ['schools.html', 'teachers.html'] },
        { role: 'Principal', expectedDash: 'principal-dashboard.html', forbiddenNav: ['schools.html'] },
        { role: 'Ministry Education Officer', expectedDash: 'dashboard.html', forbiddenNav: [] }
    ];

    for (const r of roles) {
        const dash = sandbox.getDashboardUrl({ role: r.role });
        assert.equal(dash, r.expectedDash, `Dashboard mismatch for ${r.role}`);

        const navHtml = sandbox.buildNavLinks({ role: r.role });
        assert.ok(navHtml.includes(r.expectedDash), `Nav for ${r.role} should link to ${r.expectedDash}`);
        for (const forbidden of r.forbiddenNav) {
            assert.ok(!navHtml.includes(forbidden), `Nav for ${r.role} must NOT expose ${forbidden}`);
        }
    }
});
