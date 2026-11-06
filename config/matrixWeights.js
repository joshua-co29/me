/**
 * National School Code of Conduct - Severity Weighting Matrix (W_level)
 * Ministry of Education, Trinidad & Tobago
 *
 * Decision Engine Configuration & Quantitative Weighting Matrix
 */

const SEVERITY_WEIGHT_MATRIX = {
    1: {
        level: 1,
        code: 'LEVEL_1',
        name: 'Level 1: Minor Infractions',
        weight: 1,
        weightRange: [1, 2],
        category: 'Minor Classroom & Procedural Infractions',
        examples: [
            'Repeated tardiness or unpunctuality',
            'Uniform or dress code non-compliance',
            'Failure to complete assigned classwork/homework',
            'Minor classroom distraction or talking out of turn',
            'Eating or chewing gum in restricted areas'
        ],
        protocol: 'Classroom Management & Teacher Warning',
        defaultAction: 'Teacher Warning / Behavioral Reflection Note',
        escalationThreshold: 3 // 3 occurrences trigger Level 2 escalation
    },
    2: {
        level: 2,
        code: 'LEVEL_2',
        name: 'Level 2: Minor-to-Moderate Infractions',
        weight: 3,
        weightRange: [2, 3],
        category: 'Disruptive Conduct & Repeated Defiance',
        examples: [
            'Persistent disruption of teaching and learning',
            'Unexcused absence / class cutting (truancy)',
            'Unauthorized use of electronic devices/smartphones',
            'Cafeteria, assembly, or corridor misconduct',
            'Inappropriate or disrespectful language toward peers'
        ],
        protocol: 'Parent Communication & Guidance Counseling Referral',
        defaultAction: 'Parent Conference Logged / Counseling Referral',
        escalationThreshold: 2 // 2 occurrences trigger Level 3 escalation
    },
    3: {
        level: 3,
        code: 'LEVEL_3',
        name: 'Level 3: Moderate-to-Serious Infractions',
        weight: 7,
        weightRange: [5, 8],
        category: 'Defiance of Authority & Property Damage',
        examples: [
            'Direct insubordination / refusal to comply with staff instruction',
            'Profanity or verbal abuse directed at staff or students',
            'Vandalism or defacing of school/public property',
            'Gambling, wagering, or unauthorized financial transactions',
            'Leaving school compound without authorization'
        ],
        protocol: 'Dean Formal Review & Behavioral Intervention Plan',
        defaultAction: 'Dean Formal Review / Peer Mediation Protocol',
        escalationThreshold: 2 // 2 occurrences trigger Level 4 escalation
    },
    4: {
        level: 4,
        code: 'LEVEL_4',
        name: 'Level 4: Serious & Dangerous Infractions',
        weight: 12,
        weightRange: [10, 15],
        category: 'Violence, Harassment & Endangerment',
        examples: [
            'Physical altercation / fighting causing minor injury',
            'Bullying, cyberbullying, or systematic harassment',
            'Extortion, coercion, or intimidation of students',
            'Theft, robbery, or possession of stolen items',
            'Possession or suspected use of alcohol, tobacco, or e-cigarettes'
        ],
        protocol: 'Administrative Suspension & Multi-Disciplinary Case Conference',
        defaultAction: 'Internal Suspension / Case Conference / External Support',
        escalationThreshold: 1 // Single occurrence triggers emergency review
    },
    5: {
        level: 5,
        code: 'LEVEL_5',
        name: 'Level 5: Critical Misconduct & Criminal Infractions',
        weight: 30,
        weightRange: [25, 50],
        category: 'High-Level Security & Criminal Violations',
        examples: [
            'Possession, distribution, or use of illegal narcotics/controlled substances',
            'Possession of dangerous weapons, firearms, or sharp instruments',
            'Severe physical assault or infliction of grievous bodily harm',
            'Sexual harassment, sexual assault, or indecent exposure',
            'Arson, bomb threats, or terroristic threats against the school'
        ],
        protocol: 'Immediate Removal, Police Notification & Ministry Escalation',
        defaultAction: 'Ministry Escalated Review / Police Referral / Extended Suspension',
        escalationThreshold: 1 // Immediate national escalation
    }
};

/**
 * Triage Decision Thresholds based on Cumulative Score:
 * Score S = Sum(W_level * Frequency_Multiplier * Recency_Weight)
 */
const TRIAGE_THRESHOLDS = {
    TIER_0: {
        level: 0,
        label: 'Tier 0 — Low Risk (Normal Classroom Monitoring)',
        minScore: 0,
        maxScore: 4,
        badgeClass: 'triage-0',
        color: '#15803d',
        actionRequired: 'Classroom teacher monitoring; no administrative intervention needed.'
    },
    TIER_1: {
        level: 1,
        label: 'Tier 1 — Moderate Risk (Guidance Referral)',
        minScore: 5,
        maxScore: 14,
        badgeClass: 'triage-1',
        color: '#b45309',
        actionRequired: 'Guidance counseling referral, parent conference logged, attendance review.'
    },
    TIER_2: {
        level: 2,
        label: 'Tier 2 — Elevated Risk (Dean Formal Intervention)',
        minScore: 15,
        maxScore: 29,
        badgeClass: 'triage-2',
        color: '#ea580c',
        actionRequired: 'Dean of Discipline formal intervention, behavioral contract, peer mediation, internal review.'
    },
    TIER_3: {
        level: 3,
        label: 'Tier 3 — High Risk / Crisis (Ministry Escalation)',
        minScore: 30,
        maxScore: Infinity,
        badgeClass: 'triage-3',
        color: '#b91c1c',
        actionRequired: 'Principal intervention, Ministry Education Officer case conference, Student Support Services Division (SSSD).'
    }
};

/**
 * Evaluates the Decision Factor & Risk Score for a given list of incidents.
 *
 * @param {Array} incidents - List of incident objects associated with student
 * @param {Object} [options] - Optional weighting parameters
 * @returns {Object} Comprehensive evaluation result
 */
function evaluateDecisionFactor(incidents = [], options = {}) {
    let rawScore = 0;
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const levelBreakdown = [];

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    incidents.forEach(inc => {
        // Resolve level (1 through 5)
        let lvl = 1;
        if (inc.level) {
            lvl = parseInt(inc.level);
        } else if (inc.matrix) {
            const m = inc.matrix.toLowerCase();
            if (m.includes('5')) lvl = 5;
            else if (m.includes('4')) lvl = 4;
            else if (m.includes('3')) lvl = 3;
            else if (m.includes('2')) lvl = 2;
            else lvl = 1;
        }

        // Clamp between 1 and 5
        lvl = Math.max(1, Math.min(5, lvl || 1));
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

        const config = SEVERITY_WEIGHT_MATRIX[lvl] || SEVERITY_WEIGHT_MATRIX[1];
        const baseWeight = config.weight;

        // Recency weighting: Incidents within 30 days carry full weight; older incidents decay slightly
        let recencyFactor = 1.0;
        if (inc.created_at || inc.createdAt) {
            const incDate = new Date(inc.created_at || inc.createdAt).getTime();
            const daysAgo = (now - incDate) / DAY_MS;
            if (daysAgo <= 30) recencyFactor = 1.0;
            else if (daysAgo <= 90) recencyFactor = 0.85;
            else if (daysAgo <= 180) recencyFactor = 0.70;
            else recencyFactor = 0.50; // Older than 6 months
        }

        // Unresolved / Open cases carry an escalation premium (+25%)
        const statusMultiplier = (inc.status && inc.status.toLowerCase() === 'resolved') ? 0.8 : 1.25;

        const incidentScore = baseWeight * recencyFactor * statusMultiplier;
        rawScore += incidentScore;

        levelBreakdown.push({
            incidentId: inc.incidentId || inc.incident_id || inc.id,
            level: lvl,
            baseWeight,
            recencyFactor,
            statusMultiplier,
            effectiveScore: Math.round(incidentScore * 10) / 10,
            status: inc.status || 'Open',
            date: inc.date || 'Recent'
        });
    });

    const finalScore = Math.round(rawScore * 10) / 10;

    // Determine Triage Tier
    let assignedTier = TRIAGE_THRESHOLDS.TIER_0;
    if (finalScore >= TRIAGE_THRESHOLDS.TIER_3.minScore) {
        assignedTier = TRIAGE_THRESHOLDS.TIER_3;
    } else if (finalScore >= TRIAGE_THRESHOLDS.TIER_2.minScore) {
        assignedTier = TRIAGE_THRESHOLDS.TIER_2;
    } else if (finalScore >= TRIAGE_THRESHOLDS.TIER_1.minScore) {
        assignedTier = TRIAGE_THRESHOLDS.TIER_1;
    }

    // Critical override: Any Level 5 infraction automatically elevates to Tier 3
    if (levelCounts[5] > 0) {
        assignedTier = TRIAGE_THRESHOLDS.TIER_3;
    }

    return {
        totalIncidents: incidents.length,
        score: finalScore,
        triageLevel: assignedTier.level,
        triageLabel: assignedTier.label,
        triageColor: assignedTier.color,
        actionRequired: assignedTier.actionRequired,
        levelCounts,
        breakdown: levelBreakdown
    };
}

module.exports = {
    SEVERITY_WEIGHT_MATRIX,
    TRIAGE_THRESHOLDS,
    evaluateDecisionFactor
};

