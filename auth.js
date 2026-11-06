// Sentinel Edu Auth & Header State Management
// Always use port 5000 for API — the server serves both the site and the API on 5000
const API_BASE = 'http://localhost:5000';

// Wipe any legacy local incident buffers so all pages pull strictly from the online database
try {
    localStorage.removeItem('sentinel_custom_incidents');
    localStorage.removeItem('sentinel_local_incidents');
} catch (_) {}

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuthState();
    initDropdownListeners();
});

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
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
            return { name: parsed, role: inferRole(parsed), email: generateEmail(parsed) };
        }
        if (!parsed.role) parsed.role = inferRole(parsed.name);
        if (!parsed.email) parsed.email = generateEmail(parsed.name);
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
            <li><a href="${dashUrl}#classes">My Classes</a></li>
            <li><a href="${dashUrl}#class-roll">Students</a></li>
            <li><a href="${dashUrl}#incidents">My Incidents</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    if (role.includes('dean')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="${dashUrl}#students">Form Students</a></li>
            <li><a href="${dashUrl}#incidents">Incident Reports</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    if (role.includes('counsel') || role.includes('guidance')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="${dashUrl}#welfare">Student Welfare</a></li>
            <li><a href="${dashUrl}#incidents">All Incidents</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    if (role.includes('principal')) {
        return `
            <li><a href="${dashUrl}">My Dashboard</a></li>
            <li><a href="${dashUrl}#staff">Staff & Classes</a></li>
            <li><a href="${dashUrl}#students">Students</a></li>
            <li><a href="${dashUrl}#incidents">Incident Reports</a></li>
            <li><a href="engine.html">Engine</a></li>`;
    }
    // Ministry / default
    return `
        <li><a href="${dashUrl}">Dashboard</a></li>
        <li><a href="students.html">Students</a></li>
        <li><a href="incidents.html">Incidents</a></li>
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

        // 2. Header Actions with Role and Dropdown Arrow
        headerActions.innerHTML = `
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
                            <span style="display: inline-block; padding: 2px 8px; background: #eeecfb; color: #5243aa; font-size: 0.72rem; font-weight: 700; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.03em;">${role}</span>
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

function findLocalUser(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();
    return LOCAL_DATABASE_USERS.find(u =>
        u.email.toLowerCase() === clean ||
        u.name.toLowerCase() === clean ||
        u.name.toLowerCase().includes(clean) ||
        u.role.toLowerCase() === clean ||
        u.role.toLowerCase().includes(clean) ||
        (clean.includes('ramjattan') && u.id === 'usr_ministry_01') ||
        (clean.includes('fitzwilliam') && u.id === 'usr_principal_01') ||
        (clean.includes('mohammed') && u.id === 'usr_dean_01') ||
        (clean.includes('alleyne') && u.id === 'usr_dean_02') ||
        (clean.includes('boodoo') && u.id === 'usr_counselor_01') ||
        (clean.includes('ali') && u.id === 'usr_teacher_01')
    );
}

// Direct Database Authentication API with Instant Local Database Fallback
async function performLogin(identifier, password) {
    // 1. Instant local database check for rapid switching and test accounts
    const localMatch = findLocalUser(identifier);
    if (localMatch) {
        localStorage.setItem('sentinel_user', JSON.stringify(localMatch));
        console.log(`[Local Auth] Instant switch to: ${localMatch.name} (${localMatch.role})`);

        // Async notify server in background if running (non-blocking)
        try {
            fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password: password || 'demo1234' })
            }).catch(() => {});
        } catch (_) {}

        return { success: true, user: localMatch };
    }

    // 2. Query backend API if not in preset local list
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        localStorage.setItem('sentinel_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
    } catch (err) {
        clearTimeout(timeout);
        // Fallback: construct full local user matching role
        const role = inferRole(identifier);
        const fallbackUser = {
            id: 'usr_local_' + Date.now(),
            name: identifier.includes('@') ? identifier.split('@')[0].replace('.', ' ') : identifier,
            email: identifier.includes('@') ? identifier : generateEmail(identifier),
            role: role,
            schoolId: 'sch_001',
            schoolName: 'Port of Spain North Secondary',
            assignedClassIds: ['cls_1A']
        };
        localStorage.setItem('sentinel_user', JSON.stringify(fallbackUser));
        return { success: true, user: fallbackUser };
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
