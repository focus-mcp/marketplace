/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkHappy } from './scenarios/fl_find/happy/invariants.js';

const GOLDENS_DIR = resolve(import.meta.dirname, 'goldens/fl_find');

describe('fl_find integration', () => {
    it('happy: interceptor files in NestJS packages', async () => {
        const output = await runTool(brick, 'find', {
            path: resolve(import.meta.dirname, '../../../..', 'fixtures/nestjs/packages'),
            name: 'interceptor',
        });

        // Layer 1: invariants (semantic)
        for (const i of checkHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        // Layer 2: golden (behavioural)
        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS_DIR, 'happy/brick.expected'),
        );
    });
});
