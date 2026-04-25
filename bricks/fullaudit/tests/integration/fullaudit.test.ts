/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetAudit } from '../../src/operations.js';
import { check as checkAuditReportAfterRunMarkdown } from './scenarios/audit_report/after-run-markdown/invariants.js';
import { check as checkAuditReportNoPriorRun } from './scenarios/audit_report/no-prior-run/invariants.js';
import { check as checkAuditRunChecksSubset } from './scenarios/audit_run/checks-subset/invariants.js';
import { check as checkAuditRunHappyAllChecks } from './scenarios/audit_run/happy-all-checks/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/synthetic');
const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens');

beforeEach(() => {
    resetAudit();
});

afterEach(() => {
    resetAudit();
});

// ─── audit_run ────────────────────────────────────────────────────────────────

describe('audit_run integration', () => {
    it('happy-all-checks: audits synthetic fixtures with all default checks', async () => {
        const output = await runTool(brick, 'run', { dir: FIXTURES_DIR });
        for (const i of checkAuditRunHappyAllChecks(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('checks-subset: only security check — code findings are empty', async () => {
        const output = await runTool(brick, 'run', {
            dir: FIXTURES_DIR,
            checks: ['security'],
        });
        for (const i of checkAuditRunChecksSubset(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── audit_report ─────────────────────────────────────────────────────────────

describe('audit_report integration', () => {
    it('after-run-markdown: sequenced audit_run then audit_report returns markdown', async () => {
        // State: run first to populate lastAudit
        await runTool(brick, 'run', { dir: FIXTURES_DIR });

        const output = await runTool(brick, 'report', { format: 'markdown' });
        for (const i of checkAuditReportAfterRunMarkdown(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('no-prior-run: returns guidance message when no audit_run precedes', async () => {
        // Do NOT call audit_run — state is reset in beforeEach
        const output = await runTool(brick, 'report', {});
        for (const i of checkAuditReportNoPriorRun(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'audit_report/no-prior-run/brick.expected'),
        );
    });
});
