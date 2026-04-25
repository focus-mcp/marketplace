/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invariants as inv, runTool } from '@focus-mcp/marketplace-testing';
import { describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import {
    check as checkAmbiguous,
    type Output,
} from './scenarios/ce_insertafter/ambiguous-anchor/invariants.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(thisDir, 'fixtures/synthetic/ambiguous.php');

describe('ce_insertafter integration', () => {
    it('adversarial: ambiguous anchor — must disambiguate or refuse, never silently wrong', async () => {
        const workDir = mkdtempSync(join(tmpdir(), 'ce-'));
        const workFile = join(workDir, 'ambiguous.php');
        copyFileSync(FIXTURE, workFile);

        // dryRun:true — brick never writes to disk; pattern matches 3 lines → refusal path.
        const output = await runTool<unknown, Output>(brick, 'insertafter', {
            path: workFile,
            pattern: 'hasAnyChange',
            content: '    // INSERTED MARKER',
            dryRun: true,
        });

        const results = checkAmbiguous(output, workFile);
        for (const i of results) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Post-edit syntax check (only if inserted=true; dryRun never writes to disk)
        if (output.inserted === true) {
            const syntax = await inv.fileSyntaxValid(workFile, 'php');
            if (!syntax.ok) throw new Error(`post-edit syntax check failed: ${syntax.reason}`);
        }
    });

    it('sanity: insertedNearAnchor invariant correctly catches a wrong-location insertion', () => {
        // Validates the invariant IS wired to catch the bug class.
        // Buggy output: inserted=true, atLine=999 (line ~990 away from function def at ~9).
        const buggyOutput: Output = { inserted: true, atLine: 999 };
        const buggyResults = checkAmbiguous(buggyOutput, FIXTURE);
        const buggyAnchorResult = buggyResults.at(-1);
        expect(buggyAnchorResult?.ok).toBe(false);
        expect(buggyAnchorResult?.reason).toMatch(/too far from anchor/);

        // Correct output: atLine=11 (just after closing brace of hasAnyChange) — must pass.
        const correctOutput: Output = { inserted: true, atLine: 11 };
        const correctResults = checkAmbiguous(correctOutput, FIXTURE);
        const correctAnchorResult = correctResults.at(-1);
        expect(correctAnchorResult?.ok).toBe(true);
    });
});
