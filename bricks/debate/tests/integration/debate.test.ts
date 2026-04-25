/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetDebates } from '../../src/operations.js';
import { check as checkDbtConsensusHappy } from './scenarios/dbt_consensus/happy/invariants.js';
import { check as checkDbtDebateHappy } from './scenarios/dbt_debate/happy/invariants.js';
import { check as checkDbtScoreHappy } from './scenarios/dbt_score/happy/invariants.js';
import { check as checkDbtSummaryHappy } from './scenarios/dbt_summary/happy/invariants.js';

const POSITIONS = [
    {
        role: 'advocate',
        argument:
            'Microservices enable independent scaling and deployment of individual components',
    },
    {
        role: 'skeptic',
        argument:
            'Monoliths are simpler to develop and operate without distributed system complexity',
    },
];

const SCORES = [
    { role: 'advocate', relevance: 8, evidence: 7, feasibility: 6 },
    { role: 'skeptic', relevance: 7, evidence: 8, feasibility: 9 },
];

beforeEach(() => {
    resetDebates();
});

afterEach(() => {
    resetDebates();
});

// ─── dbt_debate ───────────────────────────────────────────────────────────────

describe('dbt_debate integration', () => {
    it('happy: debate({topic, positions}) → debateId truthy, positionCount=2', async () => {
        const output = await runTool(brick, 'debate', {
            topic: 'Should we adopt microservices?',
            positions: POSITIONS,
        });
        for (const i of checkDbtDebateHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dbt_score ────────────────────────────────────────────────────────────────

describe('dbt_score integration', () => {
    it('happy: debate + score → ranking with 2 entries, ranks 1 and 2', async () => {
        const debateOutput = await runTool(brick, 'debate', {
            topic: 'Should we adopt microservices?',
            positions: POSITIONS,
        });
        const { debateId } = debateOutput as { debateId: string };
        const output = await runTool(brick, 'score', { debateId, scores: SCORES });
        for (const i of checkDbtScoreHappy(output, debateId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dbt_consensus ────────────────────────────────────────────────────────────

describe('dbt_consensus integration', () => {
    it('happy: debate + score + consensus → commonTerms array, agreementAreas non-empty', async () => {
        const debateOutput = await runTool(brick, 'debate', {
            topic: 'Should we adopt microservices?',
            positions: POSITIONS,
        });
        const { debateId } = debateOutput as { debateId: string };
        await runTool(brick, 'score', { debateId, scores: SCORES });
        const output = await runTool(brick, 'consensus', { debateId });
        for (const i of checkDbtConsensusHappy(output, debateId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dbt_summary ──────────────────────────────────────────────────────────────

describe('dbt_summary integration', () => {
    it('happy: debate + score + summary → topic, keyPoints non-empty, scored=true', async () => {
        const debateOutput = await runTool(brick, 'debate', {
            topic: 'Should we adopt microservices?',
            positions: POSITIONS,
        });
        const { debateId } = debateOutput as { debateId: string };
        await runTool(brick, 'score', { debateId, scores: SCORES });
        const output = await runTool(brick, 'summary', { debateId });
        for (const i of checkDbtSummaryHappy(output, debateId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
