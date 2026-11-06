/**
 * Automated Site Auditor Bot for Sentinel Edu
 * Tests pages, assets, links, API endpoints, role permissions, and script integrity.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_URL = 'http://localhost:5000';
const ROOT_DIR = __dirname;

const results = {
    pagesChecked: 0,
    assetsChecked: 0,
    apiEndpointsChecked: 0,
    rolesTested: 0,
    scriptsVerified: 0,
    passed: [],
    warnings: [],
    errors: []
};

function pass(msg) { results.passed.push(msg); }
function warn(msg) { results.warnings.push(msg); console.warn('⚠️  WARN:', msg); }
function error(msg) { results.errors.push(msg); console.error('❌ ERROR:', msg); }

// HTTP request helper
function fetchUrl(urlPath, options = {}) {
    return new Promise((resolve) => {
        const fullUrl = new URL(urlPath, BASE_URL);
        const reqOptions = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || 5000,
            path: fullUrl.pathname + fullUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch (_) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body,
                    json: parsed
                });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 0, error: err.message, body: null, json: null });
        });

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE AND ASSET AUDIT
// ─────────────────────────────────────────────────────────────────────────────
async function auditPages() {
    console.log('\n======================================================');
    console.log(' 1. AUDITING PAGES, STATIC ASSETS, & EMBEDDED SCRIPTS');
    console.log('======================================================');

    const htmlFiles = fs.readdirSync(ROOT_DIR).filter(f => f.endsWith('.html'));

    for (const file of htmlFiles) {
        results.pagesChecked++;
        const filePath = path.join(ROOT_DIR, file);
        const html = fs.readFileSync(filePath, 'utf8');

        // Check if served via HTTP 200
        const res = await fetchUrl('/' + file);
        if (res.status === 200) {
            pass(`Page /${file} served successfully (200 OK)`);
        } else {
            error(`Page /${file} failed to load via server: HTTP ${res.status}`);
        }

        // 1.1 Check CSS links
        const cssMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)];
        for (const m of cssMatches) {
            const href = m[1];
            if (href.startsWith('http://') || href.startsWith('https://')) continue; // external font/css
            results.assetsChecked++;
            const localPath = path.join(ROOT_DIR, href.split('?')[0]);
            if (!fs.existsSync(localPath)) {
                error(`[${file}] Missing CSS file referenced: ${href}`);
            } else {
                pass(`[${file}] CSS file exists: ${href}`);
            }
        }

        // 1.2 Check JS scripts
        const scriptMatches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
        for (const m of scriptMatches) {
            const src = m[1];
            if (src.startsWith('http://') || src.startsWith('https://')) continue; // external cdn
            results.assetsChecked++;
            const localPath = path.join(ROOT_DIR, src.split('?')[0]);
            if (!fs.existsSync(localPath)) {
                error(`[${file}] Missing script file referenced: ${src}`);
            } else {
                pass(`[${file}] Script file exists: ${src}`);
            }
        }

        // 1.3 Check inline scripts syntax
        const inlineScripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
        for (let i = 0; i < inlineScripts.length; i++) {
            const code = inlineScripts[i][1];
            if (!code.trim()) continue;
            results.scriptsVerified++;
            try {
                new vm.Script(code);
                pass(`[${file}] Inline script #${i + 1} syntax valid`);
            } catch (syntaxErr) {
                error(`[${file}] Inline script #${i + 1} syntax error: ${syntaxErr.message}`);
            }
        }

        // 1.4 Check internal anchor links
        const hrefMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)];
        for (const m of hrefMatches) {
            const href = m[1].trim();
            if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
            
            const [targetFile, hash] = href.split('#');
            if (targetFile) {
                const targetPath = path.join(ROOT_DIR, targetFile);
                if (!fs.existsSync(targetPath)) {
                    warn(`[${file}] Broken link: target file does not exist: ${targetFile}`);
                }
            }
            if (hash && (!targetFile || targetFile === file)) {
                // Check if element with this id exists in this file
                const idPattern = new RegExp(`id=["']${hash}["']`, 'i');
                if (!idPattern.test(html)) {
                    warn(`[${file}] In-page anchor #${hash} has no matching id on this page`);
                }
            }
        }

        // 1.5 Check onclick references
        const onclickMatches = [...html.matchAll(/onclick=["']([^"']+)["']/gi)];
        for (const m of onclickMatches) {
            const handler = m[1].trim();
            // Basic sanity: check if function name appears anywhere in scripts or auth.js
            const fnMatch = handler.match(/^([a-zA-Z0-9_$]+)\s*\(/);
            if (fnMatch) {
                const fnName = fnMatch[1];
                const authJs = fs.readFileSync(path.join(ROOT_DIR, 'auth.js'), 'utf8');
                const isDefined = html.includes(`function ${fnName}`) ||
                                  html.includes(`const ${fnName}`) ||
                                  html.includes(`let ${fnName}`) ||
                                  authJs.includes(`function ${fnName}`);
                if (!isDefined) {
                    warn(`[${file}] onclick handler calls function '${fnName}' which may not be defined in ${file} or auth.js`);
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. API ENDPOINTS AUDIT
// ─────────────────────────────────────────────────────────────────────────────
async function auditApis() {
    console.log('\n======================================================');
    console.log(' 2. AUDITING BACKEND REST APIS (PORT 5000)');
    console.log('======================================================');

    const apis = [
        { name: 'Health check', path: '/api/health', method: 'GET', expectStatus: 200, check: (d) => d.json && d.json.status === 'online' },
        { name: 'List schools', path: '/api/schools', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length >= 3 },
        { name: 'Get school POSNS', path: '/api/schools/sch_001', method: 'GET', expectStatus: 200, check: (d) => d.json && (d.json.id === 'sch_001' || (d.json.school && d.json.school.id === 'sch_001')) },
        { name: 'Get school classes', path: '/api/classes/by-school/sch_001', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length > 0 },
        { name: 'Get teacher classes', path: '/api/classes/by-teacher/usr_teacher_01', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length === 1 },
        { name: 'Get students by class', path: '/api/students/by-class/cls_1A', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length > 0 },
        { name: 'Get students by school', path: '/api/students/by-school/sch_001', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length > 0 },
        { name: 'Get staff by school', path: '/api/staff/by-school/sch_001', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length >= 5 },
        { name: 'All incidents', path: '/api/incidents', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) && d.json.length >= 10 },
        { name: 'Teacher incidents', path: '/api/incidents/by-teacher/usr_teacher_01', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) },
        { name: 'School incidents', path: '/api/incidents/by-school/sch_001', method: 'GET', expectStatus: 200, check: (d) => Array.isArray(d.json) },
        { name: 'National stats', path: '/api/stats', method: 'GET', expectStatus: 200, check: (d) => d.json && typeof d.json.totalIncidents === 'number' },
        { name: 'School stats', path: '/api/stats/school/sch_001', method: 'GET', expectStatus: 200, check: (d) => d.json && typeof d.json.totalIncidents === 'number' },
        {
            name: 'Incidents by forms (POST)',
            path: '/api/incidents/by-forms',
            method: 'POST',
            body: { schoolId: 'sch_001', forms: ['Form 1', 'Form 2'] },
            headers: { 'Content-Type': 'application/json' },
            expectStatus: 200,
            check: (d) => Array.isArray(d.json)
        }
    ];

    for (const api of apis) {
        results.apiEndpointsChecked++;
        const res = await fetchUrl(api.path, {
            method: api.method,
            body: api.body,
            headers: api.headers
        });

        if (res.status === api.expectStatus && (!api.check || api.check(res))) {
            pass(`API [${api.method}] ${api.path} -> ${res.status} OK`);
        } else {
            const preview = res.body ? res.body.slice(0, 100) : (res.error || 'No response');
            error(`API [${api.method}] ${api.path} failed! Expected ${api.expectStatus}, got ${res.status}. Output: ${preview}`);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROLE AUTHENTICATION & ACCESS CONTROL AUDIT
// ─────────────────────────────────────────────────────────────────────────────
async function auditRoles() {
    console.log('\n======================================================');
    console.log(' 3. AUDITING ROLE PERMISSIONS & CREDENTIALS');
    console.log('======================================================');

    const testAccounts = [
        { role: 'Teacher', email: 's.ali@posns.edu.tt', targetPage: 'teacher-dashboard.html' },
        { role: 'Lower Dean', email: 'r.mohammed@posns.edu.tt', targetPage: 'dean-dashboard.html' },
        { role: 'Upper Dean', email: 's.alleyne@posns.edu.tt', targetPage: 'dean-dashboard.html' },
        { role: 'Guidance Counselor', email: 't.boodoo@posns.edu.tt', targetPage: 'counselor-dashboard.html' },
        { role: 'Principal', email: 'g.fitzwilliam@posns.edu.tt', targetPage: 'principal-dashboard.html' },
        { role: 'Ministry Officer', email: 's.ramjattan@moe.gov.tt', targetPage: 'dashboard.html' }
    ];

    for (const acc of testAccounts) {
        results.rolesTested++;
        const res = await fetchUrl('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { identifier: acc.email, password: 'demo1234' }
        });

        if (res.status !== 200 || !res.json || !res.json.success) {
            error(`Authentication failed for ${acc.role} (${acc.email}): ${res.body}`);
            continue;
        }

        const user = res.json.user;
        pass(`Auth success: ${acc.role} (${user.name})`);

        // Verify role-based fields
        if (acc.role === 'Teacher') {
            if (!user.assignedClassIds || user.assignedClassIds.length === 0) {
                error(`Teacher ${user.name} has no assignedClassIds returned!`);
            } else {
                pass(`Teacher assigned classes verified: ${user.assignedClassIds.join(', ')}`);
            }
        }
        if (acc.role.includes('Dean')) {
            if (!user.coversForms || user.coversForms.length === 0) {
                error(`Dean ${user.name} has no coversForms returned!`);
            } else {
                pass(`Dean covered forms verified: ${user.coversForms.join(', ')}`);
            }
        }
    }

    // 3.2 Negative test: Invalid credentials
    const badLogin = await fetchUrl('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: 's.ali@posns.edu.tt', password: 'wrongpassword' }
    });
    if (badLogin.status === 401) {
        pass('Negative login test (wrong password) correctly rejected with 401');
    } else {
        error(`Negative login test failed: expected 401, got ${badLogin.status}`);
    }

    // 3.3 Negative test: Unknown user
    const unknownUser = await fetchUrl('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: 'nobody@nowhere.com', password: 'demo' }
    });
    if (unknownUser.status === 401) {
        pass('Negative login test (unknown user) correctly rejected with 401');
    } else {
        error(`Negative login test failed: expected 401, got ${unknownUser.status}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INCIDENT LOGGING & MUTATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────
async function auditIncidentMutation() {
    console.log('\n======================================================');
    console.log(' 4. AUDITING INCIDENT LOGGING & DB MUTATION');
    console.log('======================================================');

    const newInc = {
        studentName: 'Automated Test Student',
        classId: 'cls_1A',
        schoolId: 'sch_001',
        loggedById: 'usr_teacher_01',
        loggedBy: 'Ms. Sarah Ali',
        matrix: 'Disruptive Behaviour',
        level: 1,
        action: 'Automated test warning',
        description: 'Test incident generated by auditor bot',
        form: 'Form 1',
        status: 'open',
        date: new Date().toISOString()
    };

    const res = await fetchUrl('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: newInc
    });

    if (res.status === 201 && res.json && res.json.success) {
        pass(`Incident creation test passed: created ID ${res.json.incident.id}`);

        // Verify retrieval by teacher
        const checkRes = await fetchUrl('/api/incidents/by-teacher/usr_teacher_01');
        const found = checkRes.json && checkRes.json.some(i => i.id === res.json.incident.id);
        if (found) {
            pass('Created incident correctly appears in teacher incident stream');
        } else {
            error('Created incident missing from teacher incident stream');
        }
    } else {
        error(`Incident creation failed: HTTP ${res.status} - ${res.body}`);
    }
}

// Run full suite
async function runBot() {
    console.log('🚀 Sentinel Edu Site Auditor Bot starting...');
    const startTime = Date.now();

    try {
        await auditPages();
        await auditApis();
        await auditRoles();
        await auditIncidentMutation();
    } catch (e) {
        error(`Unexpected auditor bot exception: ${e.message}\n${e.stack}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n======================================================');
    console.log(' AUDIT SUMMARY');
    console.log('======================================================');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📄 Pages Audited: ${results.pagesChecked}`);
    console.log(`📦 Assets Verified: ${results.assetsChecked}`);
    console.log(`🔌 APIs Tested: ${results.apiEndpointsChecked}`);
    console.log(`👥 Roles Audited: ${results.rolesTested}`);
    console.log(`📜 Scripts Checked: ${results.scriptsVerified}`);
    console.log(`✅ Passed Checks: ${results.passed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.warnings.length > 0) {
        console.log('\n⚠️  ALL WARNINGS:');
        results.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
    }
    if (results.errors.length > 0) {
        console.log('\n❌ ALL ERRORS:');
        results.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }
}

runBot();

