/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkAdversarial } from './scenarios/fl_glob/adversarial/invariants.js';
import { check as checkHappy } from './scenarios/fl_glob/happy/invariants.js';

const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens/fl_glob');

describe('fl_glob integration', () => {
    it('happy: all *.module.ts under NestJS packages/core', async () => {
        const input = {
            path: resolve(import.meta.dirname, '../../../..', 'fixtures/nestjs/packages/core'),
            pattern: '**/*.module.ts',
        };
        const output = await runTool(brick, 'glob', input);

        // Layer 1: invariants (semantic)
        for (const i of checkHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Layer 2: golden (behavioural)
        const json = JSON.stringify(output, null, 2);
        await expectMatchesGolden(json, resolve(GOLDENS_DIR, 'happy/brick.expected'));
    });

    it('adversarial: empty directory returns matches=[] cleanly', async () => {
        const emptyDir = mkdtempSync(join(tmpdir(), 'fl-empty-'));
        const output = await runTool(brick, 'glob', {
            path: emptyDir,
            pattern: '**/*.nonexistent',
        });
        for (const i of checkAdversarial(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'adversarial/brick.expected'),
        );
    });
});
