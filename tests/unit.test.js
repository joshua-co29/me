const test = require('node:test');
const assert = require('node:assert/strict');
const {
    SEVERITY_WEIGHT_MATRIX,
    TRIAGE_THRESHOLDS,
    evaluateDecisionFactor
} = require('../config/matrixWeights');

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgoIso = (days) => new Date(Date.now() - days * DAY_MS).toISOString();

test('1. Severity Matrix Weights (Levels 1-5)', () => {
    assert.equal(SEVERITY_WEIGHT_MATRIX[1].weight, 1);
    assert.equal(SEVERITY_WEIGHT_MATRIX[2].weight, 3);
    assert.equal(SEVERITY_WEIGHT_MATRIX[3].weight, 7);
    assert.equal(SEVERITY_WEIGHT_MATRIX[4].weight, 12);
    assert.equal(SEVERITY_WEIGHT_MATRIX[5].weight, 25);
});

test('2. Open (1.25x) vs Resolved (0.8x) status multipliers', () => {
    const openEval = evaluateDecisionFactor([
        { id: 't1', level: 2, status: 'Open', created_at: daysAgoIso(5) }
    ]);
    // weight 3 * recency 1.0 * status 1.25 = 3.75 -> rounded 3.8
    assert.equal(openEval.score, 3.8);
    assert.equal(openEval.triageLevel, 0);

    const resolvedEval = evaluateDecisionFactor([
        { id: 't2', level: 2, status: 'Resolved', created_at: daysAgoIso(5) }
    ]);
    // weight 3 * recency 1.0 * status 0.8 = 2.4
    assert.equal(resolvedEval.score, 2.4);
    assert.equal(resolvedEval.triageLevel, 0);
});

test('3. Recency decay brackets (<=30d: 1.0, <=90d: 0.85, <=180d: 0.70, >180d: 0.50)', () => {
    const cases = [
        { days: 10, expectedFactor: 1.0 },
        { days: 60, expectedFactor: 0.85 },
        { days: 120, expectedFactor: 0.70 },
        { days: 240, expectedFactor: 0.50 }
    ];

    for (const c of cases) {
        const res = evaluateDecisionFactor([
            { id: `rec_${c.days}`, level: 4, status: 'Open', created_at: daysAgoIso(c.days) }
        ]);
        assert.equal(res.breakdown[0].recencyFactor, c.expectedFactor);
        // baseWeight 12 * expectedFactor * 1.25 (Open)
        const expectedScore = Math.round(12 * c.expectedFactor * 1.25 * 10) / 10;
        assert.equal(res.score, expectedScore);
    }
});

test('4. Triage Tier thresholds (Tier 0, Tier 1, Tier 2, Tier 3)', () => {
    // Tier 0 (0-4): Level 1 Open = 1 * 1.0 * 1.25 = 1.3
    assert.equal(evaluateDecisionFactor([{ level: 1, status: 'Open', created_at: daysAgoIso(1) }]).triageLevel, 0);

    // Tier 1 (5-14): Level 3 Open = 7 * 1.0 * 1.25 = 8.8
    assert.equal(evaluateDecisionFactor([{ level: 3, status: 'Open', created_at: daysAgoIso(1) }]).triageLevel, 1);

    // Tier 2 (15-29): Level 4 Open = 12 * 1.0 * 1.25 = 15.0
    assert.equal(evaluateDecisionFactor([{ level: 4, status: 'Open', created_at: daysAgoIso(1) }]).triageLevel, 2);

    // Tier 3 (30+): Two Level 4 Open = 30.0
    assert.equal(
        evaluateDecisionFactor([
            { level: 4, status: 'Open', created_at: daysAgoIso(1) },
            { level: 4, status: 'Open', created_at: daysAgoIso(1) }
        ]).triageLevel,
        3
    );
});

test('5. Critical Override: Single Resolved Level 5 (>180d) still forces Tier 3', () => {
    // 25 * 0.50 (old) * 0.80 (Resolved) = 10.0 (normally Tier 1), but Level 5 overrides to Tier 3
    const res = evaluateDecisionFactor([
        { id: 'crit_1', level: 5, status: 'Resolved', created_at: daysAgoIso(200) }
    ]);
    assert.equal(res.score, 10.0);
    assert.equal(res.levelCounts[5], 1);
    assert.equal(res.triageLevel, TRIAGE_THRESHOLDS.TIER_3.level);
});
