/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkArchitectureHappy } from './scenarios/ovw_architecture/happy/invariants.js';
import { check as checkConventionsHappy } from './scenarios/ovw_conventions/happy/invariants.js';
import { check as checkDependenciesHappy } from './scenarios/ovw_dependencies/happy/invariants.js';
import { check as checkProjectHappy } from './scenarios/ovw_project/happy/invariants.js';

const NESTJS = resolve(import.meta.dirname, '../../../..', 'fixtures/nestjs');
const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);

const GOLDENS = {
    architecture: resolve(import.meta.dirname, 'goldens/ovw_architecture'),
    conventions: resolve(import.meta.dirname, 'goldens/ovw_conventions'),
};

describe('ovw_project integration', () => {
    it('happy: project metadata on NestJS root — typescript + framework detected', async () => {
        const output = await runTool(brick, 'project', {
            dir: NESTJS,
        });

        for (const i of checkProjectHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('ovw_architecture integration', () => {
    it('happy: architecture of NestJS injector — module-based pattern detected', async () => {
        const output = await runTool(brick, 'architecture', {
            dir: NESTJS_INJECTOR,
            maxDepth: 2,
        });

        for (const i of checkArchitectureHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.architecture, 'happy/brick.expected'),
        );
    });
});

describe('ovw_conventions integration', () => {
    it('happy: conventions of NestJS injector — spaces:2, single quotes, ESM', async () => {
        const output = await runTool(brick, 'conventions', {
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkConventionsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.conventions, 'happy/brick.expected'),
        );
    });
});

describe('ovw_dependencies integration', () => {
    it('happy: dependencies of NestJS root — production + dev listed, testRunner mocha', async () => {
        const output = await runTool(brick, 'dependencies', {
            dir: NESTJS,
        });

        for (const i of checkDependenciesHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
