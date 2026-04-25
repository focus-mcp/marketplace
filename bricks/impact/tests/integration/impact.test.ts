/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkImpAffectedHappy } from './scenarios/imp_affected/happy/invariants.js';
import { check as checkImpAnalyzeHappy } from './scenarios/imp_analyze/happy/invariants.js';
import { check as checkImpPropagateHappy } from './scenarios/imp_propagate/happy/invariants.js';

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);
const NESTJS_INJECTOR_COMPILER = resolve(NESTJS_INJECTOR, 'compiler.ts');

describe('imp_analyze integration', () => {
    it('happy: analyze impact of compiler.ts → direct and indirect dependents', async () => {
        const output = await runTool(brick, 'analyze', {
            file: NESTJS_INJECTOR_COMPILER,
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkImpAnalyzeHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('imp_affected integration', () => {
    it('happy: affected files for compiler.ts → all files that import it transitively', async () => {
        const output = await runTool(brick, 'affected', {
            files: [NESTJS_INJECTOR_COMPILER],
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkImpAffectedHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('imp_propagate integration', () => {
    it('happy: propagation graph of compiler.ts → levels of dependency reach', async () => {
        const output = await runTool(brick, 'propagate', {
            file: NESTJS_INJECTOR_COMPILER,
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkImpPropagateHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
