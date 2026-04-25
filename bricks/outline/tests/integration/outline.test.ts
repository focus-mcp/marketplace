/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkOutFileHappy } from './scenarios/out_file/happy/invariants.js';
import { check as checkOutRepoHappy } from './scenarios/out_repo/happy/invariants.js';
import { check as checkOutStructureHappy } from './scenarios/out_structure/happy/invariants.js';

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);
const NESTJS_INJECTOR_COMPILER = resolve(NESTJS_INJECTOR, 'compiler.ts');

const GOLDENS = {
    outFile: resolve(import.meta.dirname, 'goldens/out_file'),
};

describe('out_file integration', () => {
    it('happy: outline compiler.ts → exported symbols with kinds and line numbers', async () => {
        const output = await runTool(brick, 'file', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkOutFileHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.outFile, 'happy/brick.expected'),
        );
    });
});

describe('out_repo integration', () => {
    it('happy: outline NestJS injector repo → per-file symbol summary', async () => {
        const output = await runTool(brick, 'repo', {
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkOutRepoHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('out_structure integration', () => {
    it('happy: structure of NestJS injector → directory tree with file counts', async () => {
        const output = await runTool(brick, 'structure', {
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkOutStructureHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
