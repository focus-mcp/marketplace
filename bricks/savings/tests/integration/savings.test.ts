/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetSavings } from '../../src/operations.js';
import { check as checkSavCompareHappy } from './scenarios/sav_compare/happy/invariants.js';
import { check as checkSavReportHappy } from './scenarios/sav_report/happy/invariants.js';
import { check as checkSavReportNoSavings } from './scenarios/sav_report/no-savings/invariants.js';
import { check as checkSavRoiHappy } from './scenarios/sav_roi/happy/invariants.js';
import { check as checkSavTrendHappy } from './scenarios/sav_trend/happy/invariants.js';

beforeEach(() => {
    resetSavings();
});

afterEach(() => {
    resetSavings();
});

// ─── sav_report ───────────────────────────────────────────────────────────────

describe('sav_report integration', () => {
    it('happy: 10000 baseline / 2000 actual → 80% savings', async () => {
        const output = await runTool(brick, 'report', {
            baselineTokens: 10000,
            actualTokens: 2000,
        });
        for (const i of checkSavReportHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('no-savings: actual > baseline → negative savings, no error', async () => {
        const output = await runTool(brick, 'report', {
            baselineTokens: 1000,
            actualTokens: 2000,
        });
        for (const i of checkSavReportNoSavings(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── sav_compare ─────────────────────────────────────────────────────────────

describe('sav_compare integration', () => {
    it('happy: session A (80%) beats session B (50%)', async () => {
        // Build session state in the shared module singleton
        const reportA = (await runTool(brick, 'report', {
            baselineTokens: 10000,
            actualTokens: 2000, // 80%
        })) as { sessionId: string };

        const reportB = (await runTool(brick, 'report', {
            baselineTokens: 10000,
            actualTokens: 5000, // 50%
        })) as { sessionId: string };

        const output = await runTool(brick, 'compare', {
            sessionA: reportA.sessionId,
            sessionB: reportB.sessionId,
        });

        for (const i of checkSavCompareHappy(output, reportA.sessionId, reportB.sessionId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── sav_trend ────────────────────────────────────────────────────────────────

describe('sav_trend integration', () => {
    it('happy: 3 improving sessions → trend detected, avgSavingsPercent present', async () => {
        // 10% → 40% → 80% — clearly improving
        await runTool(brick, 'report', { baselineTokens: 1000, actualTokens: 900 }); // 10%
        await runTool(brick, 'report', { baselineTokens: 1000, actualTokens: 600 }); // 40%
        await runTool(brick, 'report', { baselineTokens: 1000, actualTokens: 200 }); // 80%

        const output = await runTool(brick, 'trend', { last: 3 });
        for (const i of checkSavTrendHappy(output, 3)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── sav_roi ──────────────────────────────────────────────────────────────────

describe('sav_roi integration', () => {
    it('happy: costSaved > 0 after 2 reports, tokensSaved and netBenefit present', async () => {
        await runTool(brick, 'report', { baselineTokens: 5000, actualTokens: 1000 }); // 4000 saved
        await runTool(brick, 'report', { baselineTokens: 3000, actualTokens: 500 }); // 2500 saved

        const output = await runTool(brick, 'roi', { costPerToken: 0.000003 });
        for (const i of checkSavRoiHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
