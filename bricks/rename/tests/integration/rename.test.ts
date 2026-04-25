/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
    createSandbox,
    expectMatchesGolden,
    runTool,
    type Sandbox,
} from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkBulkHappy } from './scenarios/ren_bulk/happy/invariants.js';
import { check as checkFileHappy } from './scenarios/ren_file/happy/invariants.js';
import { check as checkPreviewHappy } from './scenarios/ren_preview/happy/invariants.js';
import { check as checkSymbolHappy } from './scenarios/ren_symbol/happy/invariants.js';
import { check as checkSymbolNotFound } from './scenarios/ren_symbol/symbol-not-found/invariants.js';

const NESTJS_INJECTOR = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/packages/core/injector',
);

const HELLO_SRC = resolve(
    import.meta.dirname,
    '../../../..',
    'fixtures/nestjs/integration/hello-world/src/hello',
);

const GOLDENS = {
    preview: resolve(import.meta.dirname, 'goldens/ren_preview'),
    symbol: resolve(import.meta.dirname, 'goldens/ren_symbol'),
    bulk: resolve(import.meta.dirname, 'goldens/ren_bulk'),
};

describe('ren_preview integration', () => {
    it('happy: preview ModuleCompiler occurrences in NestJS injector (read-only)', async () => {
        const output = await runTool(brick, 'preview', {
            dir: NESTJS_INJECTOR,
            oldName: 'ModuleCompiler',
        });

        for (const i of checkPreviewHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }

        await expectMatchesGolden(
            JSON.stringify(output, null, 2),
            resolve(GOLDENS.preview, 'happy/brick.expected'),
        );
    });
});

describe('ren_symbol integration', () => {
    let sandbox: Sandbox;

    beforeEach(async () => {
        sandbox = await createSandbox('fmcp-ren-symbol-');
        await cp(HELLO_SRC, sandbox.path, { recursive: true });
    });

    afterEach(async () => {
        await sandbox.cleanup();
    });

    it('happy: rename HelloService -> GreetService in sandbox', async () => {
        const output = await runTool(brick, 'symbol', {
            dir: sandbox.path,
            oldName: 'HelloService',
            newName: 'GreetService',
            apply: true,
        });

        for (const i of checkSymbolHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('adversarial: rename non-existent symbol — zero changes, no fatal error', async () => {
        const output = await runTool(brick, 'symbol', {
            dir: sandbox.path,
            oldName: 'NonExistentSymbol9x',
            newName: 'NewName',
            apply: false,
        });

        for (const i of checkSymbolNotFound(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('ren_file integration', () => {
    let sandbox: Sandbox;

    beforeEach(async () => {
        sandbox = await createSandbox('fmcp-ren-file-');
        await cp(HELLO_SRC, sandbox.path, { recursive: true });
    });

    afterEach(async () => {
        await sandbox.cleanup();
    });

    it('happy: rename hello.service.ts -> greet.service.ts + update imports', async () => {
        const oldPath = sandbox.file('hello.service.ts');

        const output = await runTool(brick, 'file', {
            path: oldPath,
            newName: 'greet.service.ts',
            dir: sandbox.path,
            apply: true,
        });

        for (const i of checkFileHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('ren_bulk integration', () => {
    let sandbox: Sandbox;

    beforeEach(async () => {
        sandbox = await createSandbox('fmcp-ren-bulk-');
        await cp(HELLO_SRC, sandbox.path, { recursive: true });
    });

    afterEach(async () => {
        await sandbox.cleanup();
    });

    it('happy: bulk dry-run — HelloService + HelloController renames reported', async () => {
        const output = await runTool(brick, 'bulk', {
            dir: sandbox.path,
            renames: [
                { oldName: 'HelloService', newName: 'GreetService' },
                { oldName: 'HelloController', newName: 'GreetController' },
            ],
            apply: false,
        });

        for (const i of checkBulkHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
