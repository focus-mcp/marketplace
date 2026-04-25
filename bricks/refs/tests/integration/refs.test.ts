/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { expectMatchesGolden, runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkDeclarationHappy } from './scenarios/refs_declaration/happy/invariants.js';
import { check as checkHierarchyHappy } from './scenarios/refs_hierarchy/happy/invariants.js';
import { check as checkImplementationsHappy } from './scenarios/refs_implementations/happy/invariants.js';
import { check as checkReferencesHappy } from './scenarios/refs_references/happy/invariants.js';

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);

const GOLDENS = {
    references: resolve(import.meta.dirname, 'goldens/refs_references'),
    implementations: resolve(import.meta.dirname, 'goldens/refs_implementations'),
    declaration: resolve(import.meta.dirname, 'goldens/refs_declaration'),
    hierarchy: resolve(import.meta.dirname, 'goldens/refs_hierarchy'),
};

describe('refs_references integration', () => {
    it('happy: callers of ModuleCompiler in NestJS injector', async () => {
        const output = await runTool(brick, 'references', {
            name: 'ModuleCompiler',
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkReferencesHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.references, 'happy/brick.expected'),
        );
    });
});

describe('refs_implementations integration', () => {
    it('happy: implementations of ModuleOpaqueKeyFactory in NestJS injector', async () => {
        const output = await runTool(brick, 'implementations', {
            name: 'ModuleOpaqueKeyFactory',
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkImplementationsHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.implementations, 'happy/brick.expected'),
        );
    });
});

describe('refs_declaration integration', () => {
    it('happy: declaration of ModuleCompiler in NestJS injector', async () => {
        const output = await runTool(brick, 'declaration', {
            name: 'ModuleCompiler',
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkDeclarationHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.declaration, 'happy/brick.expected'),
        );
    });
});

describe('refs_hierarchy integration', () => {
    it('happy: inheritance chain of ModuleRef in NestJS injector', async () => {
        const output = await runTool(brick, 'hierarchy', {
            name: 'ModuleRef',
            dir: NESTJS_INJECTOR,
        });

        for (const i of checkHierarchyHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.hierarchy, 'happy/brick.expected'),
        );
    });
});
