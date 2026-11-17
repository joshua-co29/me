// Sentinel Edu Auth & Header State Management
// Always use port 5000 for API — the server serves both the site and the API on 5000
const API_BASE = 'http://localhost:5000';

// Wipe any legacy local incident buffers so all pages pull strictly from the online database
try {
    localStorage.removeItem('sentinel_custom_incidents');
    localStorage.removeItem('sentinel_local_incidents');
} catch (_) {}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateHeaderAuthState();
        initDropdownListeners();
    });
} else {
    updateHeaderAuthState();
    initDropdownListeners();
}

function getLoggedInUser() {
    const raw = localStorage.getItem('sentinel_user');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed.name || parsed;
    } catch {
        return raw;
    }
}

function getLoggedInUserData() {
    const raw = localStorage.getItem('sentinel_user');
    if (!raw) return null;
    try {
        let parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
            parsed = { name: parsed, role: inferRole(parsed), email: generateEmail(parsed) };
        }
        if (!parsed.role) parsed.role = inferRole(parsed.name);
        if (!parsed.email) parsed.email = generateEmail(parsed.name);
        if (!parsed.schoolId && !parsed.school_id) {
            const match = findLocalUser(parsed.email || parsed.name || parsed.id);
            if (match && (match.schoolId || match.school_id)) {
                parsed.schoolId = match.schoolId || match.school_id;
                parsed.schoolName = match.schoolName || parsed.schoolName;
            }
        }
        if (parsed.schoolId && !parsed.schoolName && window.SENTINEL_SEED_DATA && Array.isArray(window.SENTINEL_SEED_DATA.schools)) {
            const sch = window.SENTINEL_SEED_DATA.schools.find(s => s.id === parsed.schoolId);
            if (sch) parsed.schoolName = sch.name;
        }
        return parsed;
    } catch {
        return { name: raw, role: inferRole(raw), email: generateEmail(raw) };
    }
}

function inferRole(nameStr) {
    if (!nameStr) return 'Teacher';
    const lower = nameStr.toLowerCase();
    if (lower.includes('dean')) return 'Dean of Discipline';
    if (lower.includes('counselor') || lower.includes('guidance')) return 'Guidance Counselor';
    if (lower.includes('principal')) return 'Principal';
    if (lower.includes('officer') || lower.includes('ministry') || lower.includes('ramjattan')) return 'Ministry Education Officer';
    if (lower.includes('social')) return 'School Social Worker';
    if (lower.includes('teacher') || lower.includes('educator')) return 'Teacher';
    return 'Teacher'; // Default fallback role
}

function generateEmail(nameStr) {
    if (!nameStr) return 'staff@moe.edu.tt';
    const clean = nameStr.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
    return `${clean}@moe.edu.tt`;
}

/**
 * Returns the role-specific dashboard URL for a given user object.
 */
function getDashboardUrl(user) {
    if (!user || !user.role) return 'dashboard.html';
    const r = user.role.toLowerCase();
    if (r.includes('teacher'))                            return 'teacher-dashboard.html';
    if (r.includes('dean'))                               return 'dean-dashboard.html';
    if (r.includes('counsel') || r.includes('guidance'))  return 'counselor-dashboard.html';
    if (r.includes('principal'))                          return 'principal-dashboard.html';
    if (r.includes('ministry') || r.includes('officer'))  return 'dashboard.html';
    return 'dashboard.html';
}

/**
 * Returns role-specific nav link items as an HTML string.
 * Profile is accessible exclusively through the user profile dropdown.
 */
function buildNavLinks(user) {
    const dashUrl = getDashboardUrl(user);
    const role = (user && user.role || '').toLowerCase();

    if (role.includes('teacher')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="classes.html">Classes</a></li>
            <li><a href="participation-points.html">Participation Points</a></li>
            <li><a href="leaderboard.html">Leaderboard</a></li>`;
    }
    if (role.includes('dean')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="${dashUrl}#incidents">Incident Reports</a></li>
            <li><a href="${dashUrl}#attendance">Attendance</a></li>
            <li><a href="${dashUrl}#students">Students</a></li>
            <li><a href="leaderboard.html">Leaderboard</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    if (role.includes('counsel') || role.includes('guidance')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="${dashUrl}#welfare">Student Welfare</a></li>
            <li><a href="${dashUrl}#incidents">All Incidents</a></li>
            <li><a href="leaderboard.html">Leaderboard</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    if (role.includes('principal')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="teachers.html">Teachers</a></li>
            <li><a href="students.html">Students</a></li>
            <li><a href="incidents.html">Incident Reports</a></li>
            <li><a href="leaderboard.html">Leaderboard</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    // Ministry / default
    return `
        <li><a href="${dashUrl}">Dashboard</a></li>
        <li><a href="students.html">Students</a></li>
        <li><a href="schools.html">Schools</a></li>
        <li><a href="teachers.html">Teachers</a></li>
        <li><a href="incidents.html">Incidents</a></li>
        <li><a href="leaderboard.html">Leaderboard</a></li>
        <li><a href="engine.html">Engine</a></li>`;
}

/**
 * Global helper to trigger the incident logging flow regardless of page
 */
function handleLogIncidentClick(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const currentPath = window.location.pathname.split('/').pop();
    if (currentPath === 'incidents.html') {
        if (typeof toggleForm === 'function') {
            toggleForm();
            return;
        }
    }
    if (currentPath === 'dean-dashboard.html' || currentPath === 'dean.html') {
        if (typeof toggleDeanLogForm === 'function') {
            toggleDeanLogForm(true);
            return;
        }
    }
    const userData = (typeof getLoggedInUserData === 'function') ? getLoggedInUserData() : null;
    if (userData && (userData.role || '').toLowerCase().includes('dean')) {
        window.location.href = 'dean-dashboard.html?action=new#incidents';
        return;
    }
    window.location.href = 'incidents.html?action=new';
}

/**
 * Returns the "Log Incident" black header action button for all logged-in staff.
 */
function buildActionButton(user) {
    return `<button type="button" onclick="handleLogIncidentClick(event)" class="btn-enroll-header" style="background: #111111; color: #ffffff; border: none; cursor: pointer; font-family: inherit; font-size: 0.9rem; font-weight: 600; padding: 0.5rem 1.1rem; border-radius: 3px; display: inline-flex; align-items: center; gap: 0.4rem;">Log Incident</button>`;
}

function updateHeaderAuthState() {
    const userData = getLoggedInUserData();
    const navLinks = document.querySelector('.nav-links');
    const headerActions = document.querySelector('.header-actions');
    const brandLogos = document.querySelectorAll('.brand-logo');

    // Shrink logo to "SE." when logged in to preserve header space
    if (brandLogos.length > 0) {
        brandLogos.forEach(logo => {
            if (userData && userData.name) {
                logo.innerHTML = 'SE<span class="brand-dot"></span>';
                logo.setAttribute('title', 'Sentinel Edu');
            } else {
                logo.innerHTML = 'Sentinel Edu<span class="brand-dot"></span>';
            }
        });
    }

    if (!navLinks || !headerActions) return;

    if (userData && userData.name) {
        let cleanName = userData.name;
        let role = userData.role || 'Staff Member';
        let email = userData.email || generateEmail(cleanName);

        // Strip parenthetical role from name if present
        if (cleanName.includes('(') && cleanName.includes(')')) {
            const match = cleanName.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                cleanName = match[1].trim();
                if (!userData.role) role = match[2].trim();
            }
        }

        const dashUrl      = getDashboardUrl(userData);
        const actionButton = buildActionButton(userData);

        // 1. Role-specific navigation links
        navLinks.innerHTML = buildNavLinks(userData);

        // 2. Header Actions with Sync Badge, Role, and Dropdown Arrow
        headerActions.innerHTML = `
            <span id="sentinelSyncBadge" title="Local-First Offline & Sync Status" style="display:inline-flex; align-items:center; gap:0.35rem; margin-left:1rem; margin-right:0.35rem; font-size:0.74rem; font-weight:700; padding:0.28rem 0.6rem; border:1px solid #fecaca; background:#fef2f2; color:#991b1b; white-space:nowrap;">Offline</span>
            <div class="user-profile-menu-container" style="position: relative;">
                <button id="userProfileTrigger" onclick="toggleProfileDropdown(event)" aria-expanded="false" style="display: flex; align-items: center; gap: 0.65rem; background: none; border: none; cursor: pointer; padding: 0.35rem 0.6rem; border-radius: 4px; font-family: inherit; transition: background 0.2s ease;">
                    <span class="login-avatar" style="background: var(--accent-lilac); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: #ffffff;">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </span>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem; text-align: left;">
                        <span style="font-weight: 700; font-size: 0.92rem; color: #111111; letter-spacing: -0.01em;">${cleanName}</span>
                        <span class="user-header-role" style="font-size: 0.8rem; color: #5e6472; font-weight: 500;">(${role})</span>
                    </div>
                    <svg class="dropdown-chevron-icon" viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px; color: #4b5162; transition: transform 0.2s ease; margin-left: 0.2rem;">
                        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                    </svg>
                </button>

                <!-- Profile Dropdown Menu -->
                <div id="profileDropdownMenu" class="profile-dropdown-content" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); width: 240px; background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 16px 32px rgba(0, 0, 0, 0.14); border-radius: 4px; z-index: 1200; overflow: hidden;">
                    <div style="padding: 0.9rem 1.1rem; border-bottom: 1px solid rgba(0, 0, 0, 0.07); background: #fafafa;">
                        <div style="font-weight: 700; font-size: 0.9rem; color: #111111;">${cleanName}</div>
                        <div style="font-size: 0.77rem; color: #6b7280; margin-top: 2px; word-break: break-all;">${email}</div>
                        <div style="margin-top: 6px;">
                            <span style="display: inline-block; padding: 2px 8px; background: #111111; color: #ffffff; font-size: 0.72rem; font-weight: 700; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.03em;">${role}</span>
                        </div>
                    </div>
                    <div style="padding: 0.4rem 0;">
                        <a href="profile.html" style="display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 1.1rem; font-size: 0.88rem; color: #222222; text-decoration: none; transition: background 0.15s ease;" onmouseover="this.style.background='#f4f4f6'" onmouseout="this.style.background='transparent'">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Profile</span>
                        </a>
                        <a href="${dashUrl}" style="display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 1.1rem; font-size: 0.88rem; color: #222222; text-decoration: none; transition: background 0.15s ease;" onmouseover="this.style.background='#f4f4f6'" onmouseout="this.style.background='transparent'">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span>My Dashboard</span>
                        </a>
                        <div style="height: 1px; background: rgba(0, 0, 0, 0.07); margin: 0.4rem 0;"></div>
                        <button onclick="logoutUser()" style="width: 100%; display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 1.1rem; font-size: 0.88rem; color: #dc2626; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.15s ease;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            </div>
            ${actionButton}
        `;
        if (typeof window !== 'undefined') {
            if (typeof window.updateSentinelSyncBadge === 'function') window.updateSentinelSyncBadge();
            if (typeof window.checkSentinelServerHealth === 'function') window.checkSentinelServerHealth();
        }
    } else if (navLinks) {
        // When not logged in, ensure Engine link is removed from the header
        navLinks.querySelectorAll('a[href*="engine.html"]').forEach(link => {
            const li = link.closest('li');
            if (li) li.remove();
            else link.remove();
        });
    }
}

// Dropdown Toggle Logic
function toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('profileDropdownMenu');
    const chevron = document.querySelector('.dropdown-chevron-icon');
    const trigger = document.getElementById('userProfileTrigger');

    if (!menu) return;

    const isVisible = menu.style.display === 'block';
    if (isVisible) {
        menu.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    } else {
        menu.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }
}

function initDropdownListeners() {
    document.addEventListener('click', (e) => {
        const container = document.querySelector('.user-profile-menu-container');
        const menu = document.getElementById('profileDropdownMenu');
        const chevron = document.querySelector('.dropdown-chevron-icon');
        const trigger = document.getElementById('userProfileTrigger');

        if (menu && container && !container.contains(e.target)) {
            menu.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }

        // Smooth in-page anchor scrolling handler
        const anchor = e.target.closest('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && href.includes('#')) {
                const [targetPath, hash] = href.split('#');
                const currentPath = window.location.pathname.split('/').pop() || 'index.html';
                if ((!targetPath || targetPath === currentPath) && hash) {
                    const el = document.getElementById(hash);
                    if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        history.pushState(null, '', '#' + hash);
                    }
                }
            }
        }
    });
}

function logoutUser() {
    localStorage.removeItem('sentinel_user');
    window.location.href = 'index.html';
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Database Seed Accounts (for instant local sign-in and quick switching)
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_DATABASE_USERS = [
    {
        id: "usr_ministry_01",
        name: "Dr. Shirley Ramjattan",
        email: "s.ramjattan@moe.gov.tt",
        role: "Ministry Education Officer",
        schoolId: null,
        schoolName: "Ministry of Education (National View)",
        assignedClassIds: [],
        coversForms: [],
        subjects: []
    },
    {
        id: "usr_principal_01",
        name: "Mr. Glen Fitzwilliam",
        email: "g.fitzwilliam@posns.edu.tt",
        role: "Principal",
        schoolId: "sch_001",
        schoolName: "Port of Spain North Secondary",
        assignedClassIds: [],
        coversForms: [],
        subjects: []
    },
    {
        id: "usr_principal_02",
        name: "Mrs. Carol Hosein",
        email: "c.hosein@sfet.edu.tt",
        role: "Principal",
        schoolId: "sch_002",
        schoolName: "San Fernando East Technical",
        assignedClassIds: [],
        coversForms: [],
        subjects: []
    },
    {
        id: "usr_principal_03",
        name: "Ms. Anita Paul",
        email: "a.paul@aapc.edu.tt",
        role: "Principal",
        schoolId: "sch_003",
        schoolName: "Arima Anglican Primary",
        assignedClassIds: [],
        coversForms: [],
        subjects: []
    },
    {
        id: "usr_dean_01",
        name: "Mr. Roland Mohammed",
        email: "r.mohammed@posns.edu.tt",
        role: "Dean of Discipline",
        deanCoverage: "All Forms",
        schoolId: "sch_001",
        schoolName: "Port of Spain North Secondary",
        coversForms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower 6", "Upper 6"],
        assignedClassIds: [],
        subjects: []
    },
    {
        id: "usr_dean_02",
        name: "Mrs. Sandra Alleyne",
        email: "s.alleyne@posns.edu.tt",
        role: "Dean of Discipline",
        deanCoverage: "All Forms",
        schoolId: "sch_001",
        schoolName: "Port of Spain North Secondary",
        coversForms: ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Lower 6", "Upper 6"],
        assignedClassIds: [],
        subjects: []
    },
    {
        id: "usr_counselor_01",
        name: "Ms. Tricia Boodoo",
        email: "t.boodoo@posns.edu.tt",
        role: "Guidance Counselor",
        schoolId: "sch_001",
        schoolName: "Port of Spain North Secondary",
        assignedClassIds: [],
        coversForms: [],
        subjects: []
    },
    {
        id: "usr_teacher_01",
        name: "Ms. Sarah Ali",
        email: "s.ali@posns.edu.tt",
        role: "Teacher",
        schoolId: "sch_001",
        schoolName: "Port of Spain North Secondary",
        assignedClassIds: ["cls_1A", "cls_dummy_01"],
        coversForms: [],
        subjects: ["Mathematics", "Additional Mathematics"]
    }
];

function getCustomUsers() {
    try {
        const raw = localStorage.getItem('sentinel_custom_users');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCustomUser(user) {
    const list = getCustomUsers();
    const existingIdx = list.findIndex(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
    if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], ...user };
    } else {
        list.unshift(user);
    }
    localStorage.setItem('sentinel_custom_users', JSON.stringify(list));
}

function findLocalUser(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();
    const customUsers = getCustomUsers();
    const seedUsers = (typeof window !== 'undefined' && window.SENTINEL_SEED_DATA && Array.isArray(window.SENTINEL_SEED_DATA.users)) ? window.SENTINEL_SEED_DATA.users : [];
    const allUsers = [...LOCAL_DATABASE_USERS, ...customUsers, ...seedUsers];

    return allUsers.find(u =>
        (u.email && u.email.toLowerCase() === clean) ||
        (u.id && u.id.toLowerCase() === clean) ||
        (u.name && u.name.toLowerCase() === clean) ||
        (u.name && u.name.toLowerCase().includes(clean)) ||
        (u.role && u.role.toLowerCase() === clean) ||
        (u.role && u.role.toLowerCase().includes(clean)) ||
        (clean.includes('ramjattan') && u.id === 'usr_ministry_01') ||
        (clean.includes('fitzwilliam') && u.id === 'usr_principal_01') ||
        (clean.includes('hosein') && u.id === 'usr_principal_02') ||
        (clean.includes('paul') && u.id === 'usr_principal_03') ||
        (clean.includes('mohammed') && u.id === 'usr_dean_01') ||
        (clean.includes('alleyne') && u.id === 'usr_dean_02') ||
        (clean.includes('boodoo') && u.id === 'usr_counselor_01') ||
        (clean.includes('ali') && u.id === 'usr_teacher_01')
    );
}

// Direct Database Authentication API (rejects unknown accounts, wrong passwords, and SQL injection)
async function performLogin(identifier, password) {
    const cleanIdent = (identifier || '').trim();
    const SQL_INJECTION_REGEX = /(['";=]|--|\/\*|\*\/|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|TRUNCATE|OR\s+1\s*=\s*1)\b)/i;

    if (!cleanIdent || !password) {
        throw new Error('Please provide your Name/Email and Password.');
    }
    if (SQL_INJECTION_REGEX.test(cleanIdent)) {
        throw new Error('Invalid input: SQL syntax or special characters are not allowed in the email field.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanIdent, password }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) {
            const authErr = new Error(data.error || 'Login failed');
            authErr.isAuthRejection = true;
            throw authErr;
        }
        localStorage.setItem('sentinel_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
    } catch (err) {
        clearTimeout(timeout);
        if (err && err.isAuthRejection) {
            throw err;
        }
        // Offline-only fallback for known preset accounts with demo password
        const localMatch = findLocalUser(cleanIdent);
        if (localMatch && password === 'demo1234') {
            localStorage.setItem('sentinel_user', JSON.stringify(localMatch));
            return { success: true, user: localMatch };
        }
        throw new Error(err.message || 'Unable to reach authentication server.');
    }
}

async function performSignup(name, email, password, role) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }
        localStorage.setItem('sentinel_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Connection timed out. Make sure the server is running on port 5000.');
        }
        console.warn('API signup failed:', err.message);
        throw err;
    }
}

/**
 * Redirect the logged-in user to their role-appropriate dashboard.
 * Call this immediately after a successful login or signup.
 */
function redirectByRole(user) {
    if (!user || !user.role) {
        window.location.href = 'dashboard.html';
        return;
    }
    const role = user.role.toLowerCase();
    if (role.includes('teacher')) {
        window.location.href = 'teacher-dashboard.html';
    } else if (role.includes('dean')) {
        window.location.href = 'dean-dashboard.html';
    } else if (role.includes('counselor') || role.includes('counsellor') || role.includes('guidance')) {
        window.location.href = 'counselor-dashboard.html';
    } else if (role.includes('principal')) {
        window.location.href = 'principal-dashboard.html';
    } else if (role.includes('ministry') || role.includes('officer')) {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Official Statement of Conduct & SSSD Referral Case Package Generator (PDF)
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    const LEVEL_WEIGHTS = { 1: 1, 2: 3, 3: 7, 4: 12, 5: 25 };

    function ensureConductModalStyles() {
        if (typeof document === 'undefined' || document.getElementById('sentinel-conduct-print-styles')) return;
        const style = document.createElement('style');
        style.id = 'sentinel-conduct-print-styles';
        style.textContent = `
            #sentinelConductModal {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 100000;
                background: rgba(17, 17, 17, 0.72);
                overflow-y: auto;
                padding: 2rem 1rem;
                font-family: 'Google Sans', 'Inter', Arial, sans-serif;
            }
            #sentinelConductModal.is-open { display: flex; flex-direction: column; align-items: center; }
            .conduct-toolbar {
                width: 100%;
                max-width: 820px;
                background: #111111;
                color: #ffffff;
                padding: 0.85rem 1.25rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 0.75rem;
                border: 1px solid #111111;
            }
            .conduct-toolbar-btn {
                border: 1px solid #525252;
                background: transparent;
                color: #ffffff;
                padding: 0.45rem 0.9rem;
                font-size: 0.8rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                cursor: pointer;
                font-family: inherit;
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
            }
            .conduct-toolbar-icon {
                width: 16px;
                height: 16px;
                display: block;
                object-fit: contain;
            }
            .conduct-toolbar-btn.is-active {
                background: #ffffff;
                color: #111111;
                border-color: #ffffff;
            }
            .conduct-toolbar-btn.is-print {
                background: #16a34a;
                border-color: #16a34a;
                color: #ffffff;
            }
            .conduct-toolbar-btn.is-close:hover {
                background: #dc2626;
                border-color: #dc2626;
                color: #ffffff;
            }
            #sentinelConductPaper {
                width: 100%;
                max-width: 820px;
                background: #ffffff;
                color: #000000;
                border: 1px solid #000000;
                padding: 2.5rem 2.75rem;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
                box-sizing: border-box;
                font-family: 'Times New Roman', Times, serif;
                font-size: 11pt;
                font-weight: 400;
            }
            .conduct-h1 {
                font-size: 20pt;
                font-weight: 400;
                line-height: 1.15;
                color: #000000;
                margin: 4pt 0 4pt 0;
            }
            .conduct-h2,
            .conduct-section-title {
                font-size: 16pt;
                font-weight: 400;
                line-height: 1.15;
                color: #000000;
                margin: 16pt 0 6pt 0;
            }
            .conduct-para {
                font-size: 11pt;
                font-weight: 400;
                line-height: 1.5;
                text-align: justify;
                margin: 0 0 10pt 0;
                color: #000000;
            }
            .conduct-letterhead {
                padding-bottom: 6pt;
                margin-bottom: 12pt;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
                font-size: 11pt;
                font-weight: 400;
                color: #000000;
            }
            .conduct-meta-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.85rem;
                border: 1px solid #d4d4d4;
                padding: 1rem;
                margin-bottom: 1.5rem;
                background: #fafafa;
            }
            .conduct-meta-label {
                font-size: 0.68rem;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: #717682;
                font-weight: 700;
                display: block;
                margin-bottom: 0.2rem;
            }
            .conduct-meta-val {
                font-size: 0.92rem;
                font-weight: 700;
                color: #111111;
            }
            .conduct-section-title {
                font-size: 0.78rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.07em;
                color: #111111;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 0.35rem;
                margin: 1.35rem 0 0.75rem;
            }
            .conduct-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11pt;
                font-weight: 400;
                margin-bottom: 14pt;
                color: #000000;
                background: #ffffff;
            }
            .conduct-table th, .conduct-table td {
                border: 1px solid #000000;
                padding: 6pt 8pt;
                text-align: left;
                vertical-align: top;
                font-weight: 400;
                color: #000000;
                background: #ffffff;
            }
            .conduct-table th {
                background: #ffffff;
                font-size: 11pt;
                font-weight: 400;
                color: #000000;
            }
            .conduct-sig-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2rem;
                margin-top: 24pt;
                padding-top: 10pt;
            }
            .conduct-sig-line {
                border-top: 1px solid #000000;
                padding-top: 4pt;
                font-size: 11pt;
                font-weight: 400;
                color: #000000;
            }
            @media print {
                body.conduct-modal-open > *:not(#sentinelConductModal) { display: none !important; }
                html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
                #sentinelConductModal {
                    position: static !important;
                    inset: auto !important;
                    width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    background: #ffffff !important;
                    padding: 0 !important;
                    overflow: visible !important;
                }
                .conduct-toolbar { display: none !important; }
                #sentinelConductPaper {
                    max-width: 100% !important;
                    width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0.4in !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function computeDecayedPBISPoints(studentId) {
        const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        try {
            const rawLog = localStorage.getItem(`sentinel_points_log_${studentId}`);
            if (rawLog) {
                const entries = JSON.parse(rawLog);
                if (Array.isArray(entries) && entries.length > 0) {
                    const total = entries.reduce((sum, entry) => {
                        const ageMs = Math.max(0, now - Number(entry.timestamp || now));
                        const periods = Math.floor(ageMs / HALF_LIFE_MS);
                        return sum + (Number(entry.amount) || 0) * Math.pow(0.5, periods);
                    }, 0);
                    return Math.round(total);
                }
            }
            const legacy = localStorage.getItem(`sentinel_points_${studentId}`);
            if (legacy !== null) return parseInt(legacy, 10) || 0;
        } catch (_) {}
        return 0;
    }

    function resolveStudentContext(studentOrId) {
        const seedStudents = (typeof window !== 'undefined' && window.SENTINEL_SEED_DATA && Array.isArray(window.SENTINEL_SEED_DATA.students)) ? window.SENTINEL_SEED_DATA.students : [];
        const localAll = (typeof window !== 'undefined' && Array.isArray(window.allStudents)) ? window.allStudents : [];
        const localEval = (typeof window !== 'undefined' && Array.isArray(window.evaluatedStudents)) ? window.evaluatedStudents : [];
        let student = null;
        let id = '';

        if (studentOrId && typeof studentOrId === 'object') {
            student = studentOrId;
            id = student.id || student.studentId || '';
        } else {
            id = String(studentOrId || '').trim();
            student = localEval.find(s => s.id === id || s.studentId === id) ||
                      localAll.find(s => s.id === id || s.studentId === id) ||
                      seedStudents.find(s => s.id === id || s.studentId === id || s.studentNumber === id);
        }

        if (!student) {
            student = { id: id || 'stu_unknown', name: 'Student Record', form: 'Form 3', school: 'Port of Spain North Secondary', district: 'Port of Spain & Environs District', attendance: 95 };
        }
        const rawId = student.id || id;
        const cleanName = (student.name || '').toLowerCase().trim();

        // Collect all incidents
        const seedInc = (typeof window !== 'undefined' && window.SENTINEL_SEED_DATA && Array.isArray(window.SENTINEL_SEED_DATA.incidents)) ? window.SENTINEL_SEED_DATA.incidents : [];
        const memInc = (typeof window !== 'undefined' && Array.isArray(window.allIncidents)) ? window.allIncidents : [];
        let lsInc = [];
        let savedStatuses = {};
        try {
            lsInc = JSON.parse(localStorage.getItem('sentinel_incidents') || '[]');
            savedStatuses = JSON.parse(localStorage.getItem('sentinel_inc_statuses') || '{}');
        } catch (_) {}

        function formatConductIncidentDate(rawDate, createdAt) {
            if (rawDate && String(rawDate).trim()) return String(rawDate).trim();
            const dt = createdAt ? new Date(createdAt) : new Date();
            if (!isNaN(dt.getTime())) {
                return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }
            return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        const combined = [...lsInc, ...memInc, ...seedInc];
        const seen = new Set();
        const studentIncidents = combined.filter(inc => {
            const key = inc.id || inc.incidentId;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            const idLow = String(inc.id || '').toLowerCase();
            const incStuId = (inc.studentId || '').toLowerCase();
            const incName = (inc.studentName || inc.student || '').toLowerCase().trim();
            if (idLow === 'inc_test_01' || idLow === 'inc_test_02' || idLow === 'inc_test_03' ||
                incStuId === 'stu_test_01' || incStuId === 'stu_1794342607079' ||
                incName === 'test student' || incName === 'automated test student' || incName === 'test' || incName === 'rarar') {
                return false;
            }
            return (rawId && incStuId === rawId.toLowerCase()) || (cleanName && incName === cleanName);
        }).map(inc => {
            const override = savedStatuses[inc.id || inc.incidentId] || savedStatuses[inc.incidentId];
            const status = (override && override.status) ? override.status : (inc.status || 'Open');
            const mStr = String(inc.matrix || '').toLowerCase();
            const lvl = parseInt(inc.level || (
                mStr.includes('5') ? 5 : mStr.includes('4') ? 4 : mStr.includes('3') ? 3 : mStr.includes('2') ? 2 : 1
            ), 10) || 1;
            const resolvedWeight = (inc.weight !== undefined && inc.weight !== null && !isNaN(Number(inc.weight)))
                ? Number(inc.weight)
                : (LEVEL_WEIGHTS[lvl] || 1);
            const resolvedDate = formatConductIncidentDate(inc.date, inc.createdAt || inc.created_at);
            return { ...inc, status, level: lvl, weight: resolvedWeight, date: resolvedDate };
        });

        // ABC Values
        const lsAtt = localStorage.getItem(`sentinel_att_rate_${rawId}`);
        const attRate = lsAtt !== null ? Number(lsAtt) : (student.attendance !== undefined && student.attendance !== null ? Number(student.attendance) : 95);
        const absenceRate = Math.max(0, 100 - attRate);
        const lsGpa = localStorage.getItem(`sentinel_gpa_${rawId}`);
        const defaultGpa = (student.gpa !== undefined && student.gpa !== null && !isNaN(parseFloat(student.gpa)))
            ? parseFloat(student.gpa)
            : Math.max(1.10, Math.min(3.95, 4.0 - (absenceRate * 0.03) - (studentIncidents.length * 0.25)));
        const gpa = lsGpa !== null ? parseFloat(lsGpa) : defaultGpa;
        const lsFail = localStorage.getItem(`sentinel_failures_${rawId}`);
        const courseFailures = lsFail !== null ? parseInt(lsFail, 10) : (student.courseFailures !== undefined && student.courseFailures !== null ? parseInt(student.courseFailures, 10) : (gpa < 1.8 ? 3 : gpa < 2.2 ? 1 : 0));
        const pbisPoints = student.participationPoints !== undefined ? student.participationPoints : computeDecayedPBISPoints(rawId);

        let weightedSum = 0;
        let hasL5 = false;
        studentIncidents.forEach(inc => {
            const w = (inc.weight !== undefined && inc.weight !== null && !isNaN(Number(inc.weight)))
                ? Number(inc.weight)
                : (LEVEL_WEIGHTS[inc.level] || 1);
            const isResolved = (inc.status || '').toLowerCase() === 'resolved';
            if (!isResolved && inc.level === 5) hasL5 = true;
            weightedSum += isResolved ? (w * 0.2) : w;
        });

        const attPenalty = absenceRate * 0.45;
        const behBase = studentIncidents.length > 0 ? 5 : 0;
        const coursePenalty = Math.max(0, (2.5 - gpa) * 8) + Math.min(20, courseFailures * 4);
        const pbisOffset = Math.min(25, pbisPoints * 0.4);
        let rawScore = weightedSum + attPenalty + behBase + coursePenalty - pbisOffset;
        if (hasL5) rawScore = Math.max(rawScore, 75);
        const riskScore = student.riskScore !== undefined ? student.riskScore : Math.min(98, Math.max(4, Math.round(rawScore)));

        let interventions = [];
        try {
            const lsIv = JSON.parse(localStorage.getItem('sentinel_interventions') || '[]');
            interventions = lsIv.filter(iv =>
                (rawId && iv.studentId === rawId) || (cleanName && (iv.studentName || '').toLowerCase().trim() === cleanName)
            );
        } catch (_) {}

        return {
            student,
            id: rawId,
            name: student.name,
            studentNumber: student.studentNumber || student.studentId || rawId,
            form: student.form || 'Form 3',
            school: student.school || 'Port of Spain North Secondary',
            district: student.district || 'Port of Spain & Environs District',
            attRate,
            gpa: Number(gpa).toFixed(2),
            courseFailures,
            pbisPoints,
            riskScore,
            weightedSum: Number((weightedSum + behBase).toFixed(1)),
            attPenalty: Number(attPenalty.toFixed(1)),
            coursePenalty: Number(coursePenalty.toFixed(1)),
            pbisOffset: Number(pbisOffset.toFixed(1)),
            hasL5,
            incidents: studentIncidents,
            interventions
        };
    }

    let _currentPdfCtx = null;
    let _currentPdfMode = 'conduct';

    function renderConductModalBody(ctx, mode) {
        const paper = document.getElementById('sentinelConductPaper');
        if (!paper || !ctx) return;

        const isSSSD = mode === 'sssd';
        const todayStr = new Date().toLocaleDateString('en-TT', { day: '2-digit', month: 'long', year: 'numeric' });
        const docRef = `${isSSSD ? 'SSSD-REF' : 'MOE-SOC'}-${new Date().getFullYear()}-${String(ctx.id).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '001'}`;

        const openCount = ctx.incidents.filter(i => (i.status || '').toLowerCase() !== 'resolved').length;
        const resolvedCount = ctx.incidents.filter(i => (i.status || '').toLowerCase() === 'resolved').length;
        const highestLvl = ctx.incidents.reduce((mx, i) => Math.max(mx, i.level || 1), 0);
        const hasMinorIncs = ctx.incidents.some(i => (i.level || 1) <= 2);
        const hasMajorIncs = ctx.incidents.some(i => (i.level || 1) >= 3);
        const isEscalating = Boolean((ctx.student && ctx.student.isEscalating) || (hasMinorIncs && hasMajorIncs) || (ctx.incidents.length >= 2 && highestLvl >= 3));
        const needsVocational = (parseFloat(ctx.gpa) < 2.0 || ctx.courseFailures >= 2) && ctx.incidents.length > 0;
        const needsMentoring = ctx.riskScore >= 25 || openCount >= 2;

        const tierLabel = (ctx.riskScore >= 50 || ctx.hasL5)
            ? 'Tier 3: Critical Intervention & SSSD Multidisciplinary Referral'
            : (ctx.riskScore >= 25 ? 'Tier 2: Moderate Monitoring / Guidance Conference' : 'Tier 1: Good Standing / Preventive Support');

        const pathwayNotes = [];
        if (isEscalating) {
            pathwayNotes.push('An escalating behavioural pattern has been identified across the student incident history, warranting early restorative de escalation.');
        }
        if (needsVocational) {
            pathwayNotes.push('Because academic strain accompanies behavioural referrals, the student is recommended for a Vocational and Trade Course Pivot alongside Cooperative Learning placement.');
        }
        if (needsMentoring) {
            pathwayNotes.push('Placement in the structured 1 on 5 Mentoring Program is recommended to provide consistent adult and peer accountability.');
        }
        const pathwayNarrative = pathwayNotes.length > 0
            ? pathwayNotes.join(' ')
            : 'Current indicators support routine preventive recognition and continued positive behavioural participation merits.';

        const standingSummary = ctx.incidents.length === 0 && ctx.attRate >= 85
            ? 'SATISFACTORY CONDUCT: No disciplinary infractions recorded during the evaluated period.'
            : (openCount === 0 && resolvedCount > 0
                ? 'REHABILITATED / RESOLVED STANDING: Past infractions have been formally resolved through guidance and restorative review.'
                : `ACTIVE CASE MONITORING (${openCount} Open Infractions): Student is currently placed under ${tierLabel}.`);

        const incidentRows = ctx.incidents.length > 0
            ? ctx.incidents.map(inc => `
                <tr>
                    <td>${formatConductIncidentDate(inc.date, inc.createdAt || inc.created_at)}</td>
                    <td>${inc.incidentId || inc.id}</td>
                    <td>Level ${inc.level} (Wt: ${inc.weight !== undefined ? inc.weight : (LEVEL_WEIGHTS[inc.level] || 1)})</td>
                    <td>${inc.description || inc.action || 'Disciplinary incident'}</td>
                    <td>${inc.action || 'Under Review'}</td>
                    <td>${inc.status}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" style="text-align:center; color:#000000; padding:10pt;">No disciplinary incidents on file under the National School Code of Conduct.</td></tr>`;

        const interventionNarrative = ctx.interventions.length > 0
            ? ctx.interventions.map(iv => `On ${(iv.createdAt || '').slice(0, 10) || todayStr}, a ${iv.type} session was facilitated by ${iv.counselorName || 'Guidance Officer'} with an outcome of "${iv.outcome || 'In Progress'}" (${iv.notes || 'routine clinical follow-up'}).`).join(' ')
            : `No prior clinical Guidance or SSSD intervention sessions have been logged in the registry for this student. Based on the current triage score of ${ctx.riskScore}/100, the recommended protocol is ${ctx.riskScore >= 50 ? 'an Immediate SSSD Intake Assessment' : 'a Routine Guidance Check-In'}.`;

        const user = (typeof getLoggedInUserData === 'function') ? getLoggedInUserData() : null;
        const issuerName = user ? `${user.name} (${user.role})` : 'Authorized School Administrator';

        paper.innerHTML = `
            <div class="conduct-letterhead">
                <div>
                    <div style="font-size:11pt; color:#000000;">Republic of Trinidad and Tobago, Ministry of Education</div>
                    <h1 class="conduct-h1">
                        ${isSSSD ? 'SSSD Clinical Referral Case Package' : 'Official Statement of Conduct'}
                    </h1>
                    <div style="font-size:11pt; color:#000000;">
                        ${isSSSD ? 'Student Support Services Division (SSSD), Centralized Triage &amp; Case Dossier' : 'Certified Disciplinary &amp; Attendance Clearance Transcript'}
                    </div>
                </div>
                <div style="text-align:right; font-size:11pt; line-height:1.45; color:#000000;">
                    <div>Ref No: ${docRef}</div>
                    <div>Issued: ${todayStr}</div>
                    <div>Prepared By: ${issuerName}</div>
                </div>
            </div>

            <h2 class="conduct-h2">1. Student Profile &amp; Conduct Determination</h2>
            <p class="conduct-para">
                This ${isSSSD ? 'SSSD Clinical Referral Case Package' : 'Official Statement of Conduct'} is issued on ${todayStr} for ${ctx.name} (Student ID: ${ctx.studentNumber}), enrolled in ${ctx.form} at ${ctx.school} within the ${ctx.district}. Based on verified entries in the Sentinel Edu National Registry, the student holds a composite Decision Factor Triage score of ${ctx.riskScore} out of 100 (${ctx.riskScore >= 50 ? 'High Risk' : ctx.riskScore >= 25 ? 'Moderate Risk' : 'Low Risk'}) and is assigned to ${tierLabel}.
            </p>
            <p class="conduct-para">
                Across the evaluated ABC early-warning indicators, the student recorded an attendance rate of ${ctx.attRate}% (+${ctx.attPenalty} risk points), a cumulative total of ${ctx.incidents.length} behavioral incidents (${openCount} open, +${ctx.weightedSum} risk points), an academic GPA of ${ctx.gpa} with ${ctx.courseFailures} course failure(s) (+${ctx.coursePenalty} risk points), and ${ctx.pbisPoints} active PBIS positive merit points (-${ctx.pbisOffset} risk offset). ${standingSummary}
            </p>

            <h2 class="conduct-h2">2. National School Code of Conduct Incident Log</h2>
            <table class="conduct-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Incident ID</th>
                        <th>Severity Tier</th>
                        <th>Summary of Infraction</th>
                        <th>Disciplinary Action</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${incidentRows}</tbody>
            </table>

            ${isSSSD ? `
                <h2 class="conduct-h2">3. Guidance, Clinical Intervention &amp; Governance Statement</h2>
                <p class="conduct-para">
                    ${interventionNarrative}
                </p>
                <p class="conduct-para">
                    ${pathwayNarrative}
                </p>
                <p class="conduct-para">
                    Ministry Ethical Governance Notice: Algorithmic triage metrics are advisory decision support indicators only. Final clinical placement, student support services, and formal disciplinary determinations remain strictly under human Principal, Dean, and SSSD Officer oversight in accordance with the MOE National School Code of Conduct.
                </p>
            ` : `
                <h2 class="conduct-h2">3. Official Certification &amp; Recommended Support Pathway</h2>
                <p class="conduct-para">
                    ${pathwayNarrative}
                </p>
                <p class="conduct-para">
                    This official Statement of Conduct certifies that the behavioral, attendance, academic, and positive merit records summarized above reflect the verified entries in the Sentinel Edu National Registry as of ${todayStr}. Any formal disciplinary sanctions or external referrals remain subject to Principal, Dean, or Guidance Officer review.
                </p>
            `}

            <div class="conduct-sig-grid">
                <div class="conduct-sig-line">Principal / Head of Institution<br>Signature &amp; Official Stamp</div>
                <div class="conduct-sig-line">Dean of Discipline / Guidance Officer<br>Reviewing Officer Signature</div>
                <div class="conduct-sig-line">Ministry / SSSD Verification Date<br>${todayStr}</div>
            </div>
        `;
    }

    function sanitizePdfText(str) {
        return String(str || '')
            .replace(/[\u2014\u2013\u2212\u2022]/g, '-')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[^\x20-\x7E]/g, ' ');
    }

    function escapePdfStr(str) {
        return sanitizePdfText(str)
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }

    function wrapPdfText(text, maxWidthPts, fontSizePts) {
        const avgCharW = fontSizePts * 0.48;
        const words = sanitizePdfText(text).trim().split(/\s+/).filter(Boolean);
        const lines = [];
        let current = '';
        for (const w of words) {
            const candidate = current ? `${current} ${w}` : w;
            if (candidate.length * avgCharW > maxWidthPts && current) {
                lines.push(current);
                current = w;
            } else {
                current = candidate;
            }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [''];
    }

    function buildConductPdfBlob(ctx, mode) {
        const isSSSD = mode === 'sssd';
        const todayStr = new Date().toLocaleDateString('en-TT', { day: '2-digit', month: 'long', year: 'numeric' });
        const docRef = `${isSSSD ? 'SSSD-REF' : 'MOE-SOC'}-${new Date().getFullYear()}-${String(ctx.id).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '001'}`;
        const openCount = ctx.incidents.filter(i => (i.status || '').toLowerCase() !== 'resolved').length;
        const resolvedCount = ctx.incidents.filter(i => (i.status || '').toLowerCase() === 'resolved').length;
        const highestLvl = ctx.incidents.reduce((mx, i) => Math.max(mx, i.level || 1), 0);
        const hasMinorIncs = ctx.incidents.some(i => (i.level || 1) <= 2);
        const hasMajorIncs = ctx.incidents.some(i => (i.level || 1) >= 3);
        const isEscalating = Boolean((ctx.student && ctx.student.isEscalating) || (hasMinorIncs && hasMajorIncs) || (ctx.incidents.length >= 2 && highestLvl >= 3));
        const needsVocational = (parseFloat(ctx.gpa) < 2.0 || ctx.courseFailures >= 2) && ctx.incidents.length > 0;
        const needsMentoring = ctx.riskScore >= 25 || openCount >= 2;

        const tierLabel = (ctx.riskScore >= 50 || ctx.hasL5)
            ? 'Tier 3: Critical Intervention & SSSD Multidisciplinary Referral'
            : (ctx.riskScore >= 25 ? 'Tier 2: Moderate Monitoring / Guidance Conference' : 'Tier 1: Good Standing / Preventive Support');

        const pathwayNotes = [];
        if (isEscalating) {
            pathwayNotes.push('An escalating behavioural pattern has been identified across the student incident history, warranting early restorative de escalation.');
        }
        if (needsVocational) {
            pathwayNotes.push('Because academic strain accompanies behavioural referrals, the student is recommended for a Vocational and Trade Course Pivot alongside Cooperative Learning placement.');
        }
        if (needsMentoring) {
            pathwayNotes.push('Placement in the structured 1 on 5 Mentoring Program is recommended to provide consistent adult and peer accountability.');
        }
        const pathwayNarrative = pathwayNotes.length > 0
            ? pathwayNotes.join(' ')
            : 'Current indicators support routine preventive recognition and continued positive behavioural participation merits.';
        const standingSummary = ctx.incidents.length === 0 && ctx.attRate >= 85
            ? 'SATISFACTORY CONDUCT: No disciplinary infractions recorded during the evaluated period.'
            : (openCount === 0 && resolvedCount > 0
                ? 'REHABILITATED / RESOLVED STANDING: Past infractions have been formally resolved through guidance and restorative review.'
                : `ACTIVE CASE MONITORING (${openCount} Open Infractions): Student is currently placed under ${tierLabel}.`);
        const user = (typeof getLoggedInUserData === 'function') ? getLoggedInUserData() : null;
        const issuerName = user ? `${user.name} (${user.role})` : 'Authorized School Administrator';

        const pageW = 612, pageH = 792, margin = 54;
        const contentW = pageW - margin * 2;
        const pages = [[]];
        let y = pageH - margin;

        function ensureSpace(needed) {
            if (y - needed < margin) {
                pages.push([]);
                y = pageH - margin;
            }
        }
        function emit(cmd) { pages[pages.length - 1].push(cmd); }

        function drawTextLine(text, x, yPos, fontSize, wordSpacing = 0) {
            emit(`BT /F1 ${fontSize} Tf ${wordSpacing.toFixed(2)} Tw 1 0 0 1 ${x.toFixed(2)} ${yPos.toFixed(2)} Tm (${escapePdfStr(text)}) Tj ET`);
        }

        function drawHeading1(text) {
            ensureSpace(28);
            drawTextLine(text, margin, y, 20);
            y -= 24;
        }

        function drawHeading2(text) {
            ensureSpace(24);
            y -= 6;
            drawTextLine(text, margin, y, 16);
            y -= 18;
        }

        function drawJustifiedParagraph(text) {
            const fontSize = 11;
            const lineH = 16;
            const lines = wrapPdfText(text, contentW, fontSize);
            lines.forEach((line, idx) => {
                ensureSpace(lineH);
                const isLast = idx === lines.length - 1;
                const spaces = (line.match(/ /g) || []).length;
                let tw = 0;
                if (!isLast && spaces > 0) {
                    const estWidth = line.length * (fontSize * 0.48);
                    const extra = Math.max(0, contentW - estWidth);
                    tw = Math.min(8, extra / spaces);
                }
                drawTextLine(line, margin, y, fontSize, tw);
                y -= lineH;
            });
            y -= 6;
        }

        // Letterhead
        drawTextLine('Republic of Trinidad and Tobago, Ministry of Education', margin, y, 11);
        y -= 20;
        drawHeading1(isSSSD ? 'SSSD Clinical Referral Case Package' : 'Official Statement of Conduct');
        drawTextLine(`Ref No: ${docRef}  |  Issued: ${todayStr}  |  Prepared By: ${issuerName}`, margin, y, 11);
        y -= 18;

        // Section 1
        drawHeading2('1. Student Profile & Conduct Determination');
        drawJustifiedParagraph(
            `This ${isSSSD ? 'SSSD Clinical Referral Case Package' : 'Official Statement of Conduct'} is issued on ${todayStr} for ${ctx.name} (Student ID: ${ctx.studentNumber}), enrolled in ${ctx.form} at ${ctx.school} within the ${ctx.district}. Based on verified entries in the Sentinel Edu National Registry, the student holds a composite Decision Factor Triage score of ${ctx.riskScore} out of 100 (${ctx.riskScore >= 50 ? 'High Risk' : ctx.riskScore >= 25 ? 'Moderate Risk' : 'Low Risk'}) and is assigned to ${tierLabel}.`
        );
        drawJustifiedParagraph(
            `Across the evaluated ABC early-warning indicators, the student recorded an attendance rate of ${ctx.attRate}% (+${ctx.attPenalty} risk points), a cumulative total of ${ctx.incidents.length} behavioral incidents (${openCount} open, +${ctx.weightedSum} risk points), an academic GPA of ${ctx.gpa} with ${ctx.courseFailures} course failure(s) (+${ctx.coursePenalty} risk points), and ${ctx.pbisPoints} active PBIS positive merit points (-${ctx.pbisOffset} risk offset). ${standingSummary}`
        );

        // Section 2 - One Black-Bordered Table
        drawHeading2('2. National School Code of Conduct Incident Log');
        const colWidths = [58, 72, 72, 140, 102, 60];
        const headers = ['Date', 'Incident ID', 'Severity', 'Summary of Infraction', 'Action', 'Status'];
        const tableRows = ctx.incidents.length > 0
            ? ctx.incidents.map(inc => [
                formatConductIncidentDate(inc.date, inc.createdAt || inc.created_at),
                inc.incidentId || inc.id || '-',
                `Level ${inc.level} (Wt ${inc.weight !== undefined ? inc.weight : (LEVEL_WEIGHTS[inc.level] || 1)})`,
                inc.description || inc.action || 'Disciplinary incident',
                inc.action || 'Under Review',
                inc.status || 'Open'
            ])
            : [['-', '-', '-', 'No disciplinary incidents on file under the National School Code of Conduct.', '-', 'Clear']];

        function drawTableRow(cells) {
            const wrapped = cells.map((c, idx) => wrapPdfText(c, colWidths[idx] - 8, 10));
            const maxLines = Math.max(...wrapped.map(w => w.length));
            const rowH = maxLines * 13 + 8;
            ensureSpace(rowH);
            let x = margin;
            emit(`0 0 0 RG 0.6 w`);
            cells.forEach((_, idx) => {
                emit(`${x.toFixed(2)} ${(y - rowH).toFixed(2)} ${colWidths[idx].toFixed(2)} ${rowH.toFixed(2)} re S`);
                wrapped[idx].forEach((ln, li) => {
                    drawTextLine(ln, x + 4, y - 13 - li * 13, 10);
                });
                x += colWidths[idx];
            });
            y -= rowH;
        }
        drawTableRow(headers);
        tableRows.forEach(drawTableRow);
        y -= 10;

        // Section 3
        if (isSSSD) {
            drawHeading2('3. Guidance, Clinical Intervention & Governance Statement');
            const interventionNarrative = ctx.interventions.length > 0
                ? ctx.interventions.map(iv => `On ${(iv.createdAt || '').slice(0, 10) || todayStr}, a ${iv.type} session was facilitated by ${iv.counselorName || 'Guidance Officer'} with an outcome of "${iv.outcome || 'In Progress'}" (${iv.notes || 'routine clinical follow up'}).`).join(' ')
                : `No prior clinical Guidance or SSSD intervention sessions have been logged in the registry for this student. Based on the current triage score of ${ctx.riskScore}/100, the recommended protocol is ${ctx.riskScore >= 50 ? 'an Immediate SSSD Intake Assessment' : 'a Routine Guidance Check In'}.`;
            drawJustifiedParagraph(interventionNarrative);
            drawJustifiedParagraph(pathwayNarrative);
            drawJustifiedParagraph(
                'Ministry Ethical Governance Notice: Algorithmic triage metrics are advisory decision support indicators only. Final clinical placement, student support services, and formal disciplinary determinations remain strictly under human Principal, Dean, and SSSD Officer oversight in accordance with the MOE National School Code of Conduct.'
            );
        } else {
            drawHeading2('3. Official Certification & Recommended Support Pathway');
            drawJustifiedParagraph(pathwayNarrative);
            drawJustifiedParagraph(
                `This official Statement of Conduct certifies that the behavioral, attendance, academic, and positive merit records summarized above reflect the verified entries in the Sentinel Edu National Registry as of ${todayStr}. Any formal disciplinary sanctions or external referrals remain subject to Principal, Dean, or Guidance Officer review.`
            );
        }

        // Signature lines
        ensureSpace(48);
        y -= 18;
        const sigW = (contentW - 32) / 3;
        const sigLabels = ['Principal / Head of Institution', 'Dean / Guidance Officer', `Verified: ${todayStr}`];
        sigLabels.forEach((lbl, i) => {
            const sx = margin + i * (sigW + 16);
            emit(`0 0 0 RG 0.6 w ${sx.toFixed(2)} ${y.toFixed(2)} m ${(sx + sigW).toFixed(2)} ${y.toFixed(2)} l S`);
            drawTextLine(lbl, sx, y - 13, 10);
        });

        // Assemble valid PDF 1.4
        const objs = [];
        const addObj = (body) => { objs.push(body); return objs.length; };
        const fontObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
        const pageIds = [];
        const pagesObjId = objs.length + 1;
        addObj(''); // placeholder for /Pages

        pages.forEach(cmds => {
            const stream = cmds.join('\n');
            const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
            const pageId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`);
            pageIds.push(pageId);
        });
        objs[pagesObjId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
        const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        objs.forEach((body, idx) => {
            offsets.push(pdf.length);
            pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
        });
        const xrefPos = pdf.length;
        pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
        for (let i = 1; i < offsets.length; i++) {
            pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        }
        pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
        return new Blob([pdf], { type: 'application/pdf' });
    }

    function downloadConductPdfFile(ctx, mode) {
        if (!ctx) return;
        const blob = buildConductPdfBlob(ctx, mode);
        const safeName = String(ctx.name || 'Student').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        const fileName = `${mode === 'sssd' ? 'SSSD_Referral' : 'Statement_of_Conduct'}_${safeName}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function ensureConductModalElement() {
        ensureConductModalStyles();
        let modal = document.getElementById('sentinelConductModal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'sentinelConductModal';
        modal.innerHTML = `
            <div class="conduct-toolbar">
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button type="button" class="conduct-toolbar-btn" id="btnModeConduct">Statement of Conduct</button>
                    <button type="button" class="conduct-toolbar-btn" id="btnModeSSSD">SSSD Referral Case Package</button>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button type="button" class="conduct-toolbar-btn is-print" id="btnDownloadConductPdf">
                        <img src="icons/download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="Download" class="conduct-toolbar-icon">
                        <span>Download PDF</span>
                    </button>
                    <button type="button" class="conduct-toolbar-btn" id="btnPrintConductPdf">
                        <img src="icons/print_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="Print" class="conduct-toolbar-icon">
                        <span>Print</span>
                    </button>
                    <button type="button" class="conduct-toolbar-btn is-close" id="btnCloseConductModal" aria-label="Close">
                        <img src="icons/close_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="Close" class="conduct-toolbar-icon">
                        <span>Close</span>
                    </button>
                </div>
            </div>
            <div id="sentinelConductPaper"></div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btnModeConduct').addEventListener('click', () => switchConductMode('conduct'));
        document.getElementById('btnModeSSSD').addEventListener('click', () => switchConductMode('sssd'));
        document.getElementById('btnDownloadConductPdf').addEventListener('click', () => downloadConductPdfFile(_currentPdfCtx, _currentPdfMode));
        document.getElementById('btnPrintConductPdf').addEventListener('click', () => {
            if (typeof window.focus === 'function') window.focus();
            if (typeof window.print === 'function') window.print();
        });
        document.getElementById('btnCloseConductModal').addEventListener('click', window.closeStatementOfConductModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeStatementOfConductModal();
        });
        return modal;
    }

    function switchConductMode(mode) {
        _currentPdfMode = mode === 'sssd' ? 'sssd' : 'conduct';
        const b1 = document.getElementById('btnModeConduct');
        const b2 = document.getElementById('btnModeSSSD');
        if (b1) b1.classList.toggle('is-active', _currentPdfMode === 'conduct');
        if (b2) b2.classList.toggle('is-active', _currentPdfMode === 'sssd');
        renderConductModalBody(_currentPdfCtx, _currentPdfMode);
    }

    window.openStatementOfConductModal = function (studentOrId, mode) {
        ensureConductModalElement();
        _currentPdfCtx = resolveStudentContext(studentOrId);
        switchConductMode(mode || 'conduct');
        const modal = document.getElementById('sentinelConductModal');
        if (modal) modal.classList.add('is-open');
        if (typeof document !== 'undefined' && document.body) document.body.classList.add('conduct-modal-open');
    };

    function buildCustomDocumentPdfBlob(docConfig) {
        const pageW = 612, pageH = 792, margin = 54;
        const contentW = pageW - margin * 2;
        const pages = [[]];
        let y = pageH - margin;

        function ensureSpace(needed) {
            if (y - needed < margin) {
                pages.push([]);
                y = pageH - margin;
            }
        }
        function emit(cmd) { pages[pages.length - 1].push(cmd); }

        function drawTextLine(text, x, yPos, fontSize, wordSpacing = 0) {
            emit(`BT /F1 ${fontSize} Tf ${wordSpacing.toFixed(2)} Tw 1 0 0 1 ${x.toFixed(2)} ${yPos.toFixed(2)} Tm (${escapePdfStr(text)}) Tj ET`);
        }

        function drawHeading1(text) {
            const lines = wrapPdfText(text, contentW, 20);
            lines.forEach(ln => {
                ensureSpace(26);
                drawTextLine(ln, margin, y, 20);
                y -= 24;
            });
        }

        function drawHeading2(text) {
            const lines = wrapPdfText(text, contentW, 16);
            y -= 6;
            lines.forEach(ln => {
                ensureSpace(22);
                drawTextLine(ln, margin, y, 16);
                y -= 18;
            });
        }

        function drawJustifiedParagraph(text) {
            const fontSize = 11;
            const lineH = 16;
            const lines = wrapPdfText(text, contentW, fontSize);
            lines.forEach((line, idx) => {
                ensureSpace(lineH);
                const isLast = idx === lines.length - 1;
                const spaces = (line.match(/ /g) || []).length;
                let tw = 0;
                if (!isLast && spaces > 0) {
                    const estWidth = line.length * (fontSize * 0.48);
                    const extra = Math.max(0, contentW - estWidth);
                    tw = Math.min(8, extra / spaces);
                }
                drawTextLine(line, margin, y, fontSize, tw);
                y -= lineH;
            });
            y -= 6;
        }

        // Letterhead
        drawTextLine(docConfig.institutionLine || 'Republic of Trinidad and Tobago, Ministry of Education', margin, y, 11);
        y -= 20;
        drawHeading1(docConfig.title || 'Sentinel Edu Official Document');
        if (docConfig.metaLine) {
            const metaLines = wrapPdfText(docConfig.metaLine, contentW, 11);
            metaLines.forEach(ln => {
                ensureSpace(15);
                drawTextLine(ln, margin, y, 11);
                y -= 14;
            });
        }
        y -= 10;

        // Content blocks (Heading 2, Justified Paragraph, or Single Black Table)
        (docConfig.blocks || []).forEach(block => {
            if (block.type === 'h2') {
                drawHeading2(block.text || '');
            } else if (block.type === 'p') {
                drawJustifiedParagraph(block.text || '');
            } else if (block.type === 'table') {
                const headers = block.headers || [];
                const rows = block.rows || [];
                const colWidths = block.colWidths || headers.map(() => Math.floor(contentW / Math.max(1, headers.length)));
                const drawRow = (cells) => {
                    const wrapped = cells.map((c, idx) => wrapPdfText(c, Math.max(20, (colWidths[idx] || 80) - 8), 10));
                    const maxLines = Math.max(...wrapped.map(w => w.length));
                    const rowH = maxLines * 13 + 8;
                    ensureSpace(rowH);
                    let x = margin;
                    emit(`0 0 0 RG 0.6 w`);
                    cells.forEach((_, idx) => {
                        const w = colWidths[idx] || 80;
                        emit(`${x.toFixed(2)} ${(y - rowH).toFixed(2)} ${w.toFixed(2)} ${rowH.toFixed(2)} re S`);
                        wrapped[idx].forEach((ln, li) => {
                            drawTextLine(ln, x + 4, y - 13 - li * 13, 10);
                        });
                        x += w;
                    });
                    y -= rowH;
                };
                if (headers.length) drawRow(headers);
                rows.forEach(drawRow);
                y -= 10;
            }
        });

        if (Array.isArray(docConfig.sigLabels) && docConfig.sigLabels.length > 0) {
            ensureSpace(48);
            y -= 18;
            const count = docConfig.sigLabels.length;
            const sigW = (contentW - 16 * (count - 1)) / count;
            docConfig.sigLabels.forEach((lbl, i) => {
                const sx = margin + i * (sigW + 16);
                emit(`0 0 0 RG 0.6 w ${sx.toFixed(2)} ${y.toFixed(2)} m ${(sx + sigW).toFixed(2)} ${y.toFixed(2)} l S`);
                drawTextLine(lbl, sx, y - 13, 10);
            });
        }

        const objs = [];
        const addObj = (body) => { objs.push(body); return objs.length; };
        const fontObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');
        const pageIds = [];
        const pagesObjId = objs.length + 1;
        addObj('');

        pages.forEach(cmds => {
            const stream = cmds.join('\n');
            const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
            const pageId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`);
            pageIds.push(pageId);
        });
        objs[pagesObjId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
        const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        objs.forEach((body, idx) => {
            offsets.push(pdf.length);
            pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
        });
        const xrefPos = pdf.length;
        pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
        for (let i = 1; i < offsets.length; i++) {
            pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        }
        pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
        return new Blob([pdf], { type: 'application/pdf' });
    }

    window.downloadCustomDocumentPdf = function (docConfig) {
        if (!docConfig) return;
        const blob = buildCustomDocumentPdfBlob(docConfig);
        const safeFile = String(docConfig.fileName || 'Sentinel_Document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFile.endsWith('.pdf') ? safeFile : `${safeFile}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    window.closeStatementOfConductModal = function () {
        const modal = document.getElementById('sentinelConductModal');
        if (modal) modal.classList.remove('is-open');
        if (typeof document !== 'undefined' && document.body) document.body.classList.remove('conduct-modal-open');
    };
})();

// ─────────────────────────────────────────────────────────────────────────────
// Local-First Offline PWA Registration & Auto-Sync Queue
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    const QUEUE_KEY = 'sentinel_offline_queue';
    let serverOnline = false;
    let healthCheckInFlight = null;

    function getOfflineQueue() {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }

    function updateSyncBadgeUI() {
        if (typeof document === 'undefined') return;
        const badge = document.getElementById('sentinelSyncBadge');
        if (!badge) return;
        const navOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
        const online = navOnline && serverOnline;
        const qCount = getOfflineQueue().length;

        if (!online) {
            badge.style.background = '#fef2f2';
            badge.style.borderColor = '#fecaca';
            badge.style.color = '#991b1b';
            badge.textContent = qCount > 0 ? `Offline (${qCount} queued)` : 'Offline';
        } else if (qCount > 0) {
            badge.style.background = '#fefce8';
            badge.style.borderColor = '#fde68a';
            badge.style.color = '#92400e';
            badge.textContent = `Syncing (${qCount} pending)…`;
        } else {
            badge.style.background = '#f9fafb';
            badge.style.borderColor = '#d1d5db';
            badge.style.color = '#15803d';
            badge.textContent = 'Synced';
        }
    }

    async function checkServerHealth() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            serverOnline = false;
            updateSyncBadgeUI();
            return false;
        }
        if (typeof fetch !== 'function') {
            serverOnline = false;
            updateSyncBadgeUI();
            return false;
        }
        if (healthCheckInFlight) return healthCheckInFlight;

        healthCheckInFlight = (async () => {
            const endpoints = ['http://localhost:5000/api/health'];
            if (typeof window !== 'undefined' && window.location && /^https?:$/i.test(window.location.protocol)) {
                endpoints.unshift('/api/health');
            }
            let reachable = false;
            for (const ep of endpoints) {
                try {
                    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timer = ctrl ? setTimeout(() => ctrl.abort(), 2500) : null;
                    const res = await fetch(`${ep}?_t=${Date.now()}`, {
                        method: 'GET',
                        cache: 'no-store',
                        headers: { 'Accept': 'application/json' },
                        signal: ctrl ? ctrl.signal : undefined
                    });
                    if (timer) clearTimeout(timer);
                    if (res && res.ok) {
                        const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
                        if (ct.includes('application/json')) {
                            const data = await res.json();
                            if (data && data.status === 'online') {
                                reachable = true;
                                break;
                            }
                        }
                    }
                } catch (_) {}
            }
            const wasOffline = !serverOnline;
            serverOnline = reachable;
            updateSyncBadgeUI();
            healthCheckInFlight = null;
            if (reachable && wasOffline && getOfflineQueue().length > 0) {
                window.flushSentinelOfflineQueue();
            }
            return reachable;
        })();

        return healthCheckInFlight;
    }

    if (typeof window !== 'undefined') {
        window.updateSentinelSyncBadge = updateSyncBadgeUI;
        window.checkSentinelServerHealth = checkServerHealth;
        window.isSentinelServerOnline = function () { return serverOnline; };

        // Push-Based Real-Time Sync (Supabase Realtime WebSocket + SSE + BroadcastChannel, Zero Polling)
        let syncChannel = null;
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                syncChannel = new BroadcastChannel('sentinel_edu_sync');
            }
        } catch (_) {}

        const _syncSignatures = {};
        window.sentinelHasChanged = function (key, payload) {
            try {
                const str = JSON.stringify(payload);
                // Fast FNV-1a style hash + length so comparison is O(1) memory
                let hash = 2166136261;
                for (let i = 0; i < str.length; i++) {
                    hash ^= str.charCodeAt(i);
                    hash = Math.imul(hash, 16777619);
                }
                const sig = `${str.length}:${hash >>> 0}`;
                if (_syncSignatures[key] === sig) return false;
                _syncSignatures[key] = sig;
                return true;
            } catch (_) {
                return true;
            }
        };

        window.sentinelBroadcastUpdate = function (entityType, detail) {
            const payload = { type: entityType || 'all', ts: Date.now(), detail: detail || null };
            try { if (syncChannel) syncChannel.postMessage(payload); } catch (_) {}
            try { localStorage.setItem('sentinel_last_sync_event', JSON.stringify(payload)); } catch (_) {}
        };

        const _pushSubscribers = [];
        let _pushInitialized = false;
        let _pushDebounceTimer = null;

        function _notifyPushSubscribers(force, detail) {
            if (_pushDebounceTimer) clearTimeout(_pushDebounceTimer);
            _pushDebounceTimer = setTimeout(() => {
                _pushDebounceTimer = null;
                for (const sub of _pushSubscribers) {
                    sub(force, detail);
                }
            }, 250);
        }

        function _initPushListeners() {
            if (_pushInitialized) return;
            _pushInitialized = true;

            // 1. Same-browser cross-tab push
            if (syncChannel) {
                syncChannel.addEventListener('message', (e) => _notifyPushSubscribers(true, e.data));
            }
            window.addEventListener('storage', (e) => {
                if (e.key === 'sentinel_last_sync_event' || (e.key && e.key.startsWith('sentinel_'))) {
                    _notifyPushSubscribers(true, { key: e.key });
                }
            });

            // 2. Local Node Server SSE push (/api/events)
            let sseSource = null;
            const connectSse = () => {
                if (typeof EventSource === 'undefined' || sseSource) return;
                const origin = (window.location && window.location.port === '5000')
                    ? ''
                    : 'http://localhost:5000';
                try {
                    sseSource = new EventSource(`${origin}/api/events`);
                    sseSource.addEventListener('sync', (ev) => {
                        let detail = null;
                        try { detail = JSON.parse(ev.data); } catch (_) {}
                        _notifyPushSubscribers(false, detail);
                    });
                    sseSource.onerror = () => {
                        try { sseSource.close(); } catch (_) {}
                        sseSource = null;
                        setTimeout(connectSse, 8000);
                    };
                } catch (_) {
                    sseSource = null;
                }
            };
            connectSse();

            // 3. Direct Online Supabase Realtime WebSocket (independent per-table channels)
            const SUPA_WS_URL = 'wss://wrumedevccqkopguaxdi.supabase.co/realtime/v1/websocket?apikey=sb_publishable_zpd_lzgRqghcN-0X7qw7SA_I2hAZHXH&vsn=1.0.0';
            const watchedTables = ['students', 'incidents', 'classes', 'pbis_rewards', 'student_concerns', 'attendance_logs', 'interventions'];
            let ws = null;
            let hbTimer = null;
            let refCounter = 1;

            const connectSupabaseWs = () => {
                if (typeof WebSocket === 'undefined') return;
                try {
                    ws = new WebSocket(SUPA_WS_URL);
                    ws.onopen = () => {
                        watchedTables.forEach((table) => {
                            const joinMsg = {
                                topic: `realtime:${table}`,
                                event: 'phx_join',
                                payload: {
                                    config: {
                                        broadcast: { self: false },
                                        presence: { key: '' },
                                        postgres_changes: [{
                                            event: '*',
                                            schema: 'public',
                                            table
                                        }]
                                    }
                                },
                                ref: String(refCounter++)
                            };
                            ws.send(JSON.stringify(joinMsg));
                        });
                        if (hbTimer) clearInterval(hbTimer);
                        hbTimer = setInterval(() => {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    topic: 'phoenix',
                                    event: 'heartbeat',
                                    payload: {},
                                    ref: String(refCounter++)
                                }));
                            }
                        }, 25000);
                    };
                    ws.onmessage = (ev) => {
                        try {
                            const msg = JSON.parse(ev.data);
                            if (msg && msg.event === 'postgres_changes') {
                                const table = msg.payload && msg.payload.data && msg.payload.data.table;
                                _notifyPushSubscribers(false, { source: 'supabase_realtime', table });
                            }
                        } catch (_) {}
                    };
                    ws.onclose = () => {
                        if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
                        ws = null;
                        setTimeout(connectSupabaseWs, 5000);
                    };
                    ws.onerror = () => {
                        try { ws.close(); } catch (_) {}
                    };
                } catch (_) {}
            };
            connectSupabaseWs();
        }

        window.sentinelOnLiveSync = function (callback) {
            if (typeof callback !== 'function') return;
            const isModalOpen = () => {
                if (typeof document === 'undefined') return false;
                return !!document.querySelector('.modal-overlay.is-active, .modal-backdrop.is-active, #createIncidentModal[style*="flex"], #editIncidentModal[style*="flex"]');
            };
            _pushSubscribers.push((force, detail) => {
                if (!force && isModalOpen()) return;
                try { callback(detail); } catch (_) {}
            });
            _initPushListeners();
        };
    }

    window.sentinelQueueOfflineMutation = function (endpoint, method, body) {
        try {
            const queue = getOfflineQueue();
            queue.push({ endpoint, method: method || 'POST', body, queuedAt: new Date().toISOString() });
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            updateSyncBadgeUI();
        } catch (_) {}
    };

    window.flushSentinelOfflineQueue = async function () {
        if ((typeof navigator !== 'undefined' && !navigator.onLine) || !serverOnline) {
            updateSyncBadgeUI();
            return;
        }
        const queue = getOfflineQueue();
        if (!queue.length) {
            updateSyncBadgeUI();
            return;
        }
        const remaining = [];
        for (const item of queue) {
            try {
                const res = await fetch(item.endpoint, {
                    method: item.method || 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: item.body ? JSON.stringify(item.body) : undefined
                });
                if (!res.ok) remaining.push(item);
            } catch (_) {
                remaining.push(item);
                serverOnline = false;
            }
        }
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        } catch (_) {}
        updateSyncBadgeUI();
    };

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.querySelector('link[rel="manifest"]')) {
                const link = document.createElement('link');
                link.rel = 'manifest';
                link.href = 'manifest.json';
                document.head.appendChild(link);
            }
            if (typeof window !== 'undefined' && 'caches' in window) {
                caches.keys().then(keys => keys.forEach(k => {
                    if (k !== 'sentinel-edu-v4') caches.delete(k);
                })).catch(() => {});
            }
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:/.test(window.location.protocol)) {
                navigator.serviceWorker.register('sw.js').then(reg => {
                    if (reg && typeof reg.update === 'function') reg.update().catch(() => {});
                }).catch(() => {});
            }
            updateSyncBadgeUI();
            checkServerHealth();
        });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('online', () => {
            checkServerHealth();
        });
        window.addEventListener('offline', () => {
            serverOnline = false;
            updateSyncBadgeUI();
        });
        window.addEventListener('focus', () => {
            checkServerHealth();
        });
        if (typeof setInterval === 'function') {
            setInterval(checkServerHealth, 5000);
        }
    }
})();
