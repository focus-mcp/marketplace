/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkSrFullHappy } from './scenarios/sr_full/happy/invariants.js';
import { check as checkSrImportsHappy } from './scenarios/sr_imports/happy/invariants.js';
import { check as checkSrMapHappy } from './scenarios/sr_map/happy/invariants.js';
import { check as checkSrSignaturesHappy } from './scenarios/sr_signatures/happy/invariants.js';
import { check as checkSrSummaryHappy } from './scenarios/sr_summary/happy/invariants.js';

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);
const NESTJS_INJECTOR_COMPILER = resolve(NESTJS_INJECTOR, 'compiler.ts');

const GOLDENS = {
    srFull: resolve(import.meta.dirname, 'goldens/sr_full'),
    srMap: resolve(import.meta.dirname, 'goldens/sr_map'),
    srSignatures: resolve(import.meta.dirname, 'goldens/sr_signatures'),
    srImports: resolve(import.meta.dirname, 'goldens/sr_imports'),
    srSummary: resolve(import.meta.dirname, 'goldens/sr_summary'),
};

describe('sr_full integration', () => {
    it('happy: read compiler.ts → content includes ModuleCompiler', async () => {
        const output = await runTool(brick, 'full', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkSrFullHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.srFull, 'happy/brick.expected'),
        );
    });
});

describe('sr_map integration', () => {
    it('happy: map compiler.ts → class/function/type/const declarations', async () => {
        const output = await runTool(brick, 'map', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkSrMapHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.srMap, 'happy/brick.expected'),
        );
    });
});

describe('sr_signatures integration', () => {
    it('happy: signatures of compiler.ts → exported declarations only', async () => {
        const output = await runTool(brick, 'signatures', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkSrSignaturesHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.srSignatures, 'happy/brick.expected'),
        );
    });
});

describe('sr_imports integration', () => {
    it('happy: imports of compiler.ts → import statements only', async () => {
        const output = await runTool(brick, 'imports', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkSrImportsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.srImports, 'happy/brick.expected'),
        );
    });
});

describe('sr_summary integration', () => {
    it('happy: summary of compiler.ts → entries with name and line ranges', async () => {
        const output = await runTool(brick, 'summary', {
            path: NESTJS_INJECTOR_COMPILER,
        });

        for (const i of checkSrSummaryHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.srSummary, 'happy/brick.expected'),
        );
    });
});
