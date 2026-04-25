/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetDecisions } from '../../src/operations.js';
import { check as checkDecOptionsHappy } from './scenarios/dec_options/happy/invariants.js';
import { check as checkDecRecommendHappy } from './scenarios/dec_recommend/happy/invariants.js';
import { check as checkDecRecordHappy } from './scenarios/dec_record/happy/invariants.js';
import { check as checkDecTradeoffsHappy } from './scenarios/dec_tradeoffs/happy/invariants.js';

const OPTIONS = [
    { label: 'PostgreSQL', pros: ['ACID compliance', 'Mature ecosystem'], cons: ['Complex setup'] },
    {
        label: 'MongoDB',
        pros: ['Flexible schema', 'Easy scaling'],
        cons: ['No joins', 'Eventual consistency'],
    },
    { label: 'SQLite', pros: ['Zero config', 'Embedded'], cons: ['Not for production scale'] },
];

const CRITERIA = [
    { name: 'performance', weight: 0.4 },
    { name: 'ease of use', weight: 0.6 },
];

const SCORES = [
    { option: 'PostgreSQL', scores: [8, 7] },
    { option: 'MongoDB', scores: [7, 9] },
    { option: 'SQLite', scores: [5, 10] },
];

beforeEach(() => {
    resetDecisions();
});

afterEach(() => {
    resetDecisions();
});

// ─── dec_options ──────────────────────────────────────────────────────────────

describe('dec_options integration', () => {
    it('happy: options({question, options[3]}) → decisionId truthy, optionCount=3', async () => {
        const output = await runTool(brick, 'options', {
            question: 'Which database should we use?',
            options: OPTIONS,
        });
        for (const i of checkDecOptionsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dec_tradeoffs ────────────────────────────────────────────────────────────

describe('dec_tradeoffs integration', () => {
    it('happy: options + tradeoffs → criteriaCount=2, scored=3', async () => {
        const optOutput = await runTool(brick, 'options', {
            question: 'Which database should we use?',
            options: OPTIONS,
        });
        const { decisionId } = optOutput as { decisionId: string };
        const output = await runTool(brick, 'tradeoffs', {
            decisionId,
            criteria: CRITERIA,
            scores: SCORES,
        });
        for (const i of checkDecTradeoffsHappy(output, decisionId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dec_recommend ────────────────────────────────────────────────────────────

describe('dec_recommend integration', () => {
    it('happy: options + tradeoffs + recommend → ranking[3], recommended non-empty', async () => {
        const optOutput = await runTool(brick, 'options', {
            question: 'Which database should we use?',
            options: OPTIONS,
        });
        const { decisionId } = optOutput as { decisionId: string };
        await runTool(brick, 'tradeoffs', { decisionId, criteria: CRITERIA, scores: SCORES });
        const output = await runTool(brick, 'recommend', { decisionId });
        for (const i of checkDecRecommendHappy(output, decisionId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dec_record ───────────────────────────────────────────────────────────────

describe('dec_record integration', () => {
    it('happy: options + tradeoffs + recommend + record → saved=false, chosen matches', async () => {
        const optOutput = await runTool(brick, 'options', {
            question: 'Which database should we use?',
            options: OPTIONS,
        });
        const { decisionId } = optOutput as { decisionId: string };
        await runTool(brick, 'tradeoffs', { decisionId, criteria: CRITERIA, scores: SCORES });
        await runTool(brick, 'recommend', { decisionId });
        const output = await runTool(brick, 'record', {
            decisionId,
            chosen: 'PostgreSQL',
            rationale: 'Best fit for our relational data needs and team expertise',
        });
        for (const i of checkDecRecordHappy(output, decisionId, 'PostgreSQL')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
