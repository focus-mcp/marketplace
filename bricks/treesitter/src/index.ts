// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    TsExtractCallsInput,
    TsExtractImportsInput,
    TsExtractOutlineInput,
    TsExtractRefsInput,
    TsExtractSymbolsInput,
    TsIndexInput,
    TsReindexInput,
} from './operations.ts';
import {
    tsCleanup,
    tsExtractCalls,
    tsExtractImports,
    tsExtractOutline,
    tsExtractRefs,
    tsExtractSymbols,
    tsIndex,
    tsLangs,
    tsReindex,
    tsStatus,
    tsSupportedExts,
} from './operations.ts';

interface BrickBus {
    on(
        event: string,
        handler: (data: unknown) => Promise<unknown> | unknown,
    ): undefined | (() => void);
    handle(target: string, handler: (data: unknown) => Promise<unknown> | unknown): () => void;
}

interface BrickContext {
    readonly bus: BrickBus;
}

interface BrickManifest {
    readonly name: string;
    readonly prefix: string;
    readonly description: string;
    readonly dependencies: readonly string[];
    readonly tools: readonly { readonly name: string; readonly description: string }[];
    readonly tags?: readonly string[];
    readonly license?: string;
}

interface Brick {
    readonly manifest: BrickManifest;
    start(ctx: BrickContext): Promise<void> | void;
    stop(): Promise<void> | void;
}

const unsubscribers: Array<() => void> = [];

const brick: Brick = {
    manifest: manifestJson,
    start(ctx) {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
        unsubscribers.push(
            ctx.bus.handle('treesitter:index', (data) => tsIndex(data as TsIndexInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('treesitter:reindex', (data) => tsReindex(data as TsReindexInput)),
        );
        unsubscribers.push(ctx.bus.handle('treesitter:status', () => tsStatus()));
        unsubscribers.push(ctx.bus.handle('treesitter:cleanup', () => tsCleanup()));
        unsubscribers.push(ctx.bus.handle('treesitter:langs', () => tsLangs()));
        // Internal services for code-intel bricks
        unsubscribers.push(
            ctx.bus.handle('treesitter:extract-symbols', (data) =>
                tsExtractSymbols(data as TsExtractSymbolsInput),
            ),
        );
        unsubscribers.push(ctx.bus.handle('treesitter:supported-exts', () => tsSupportedExts()));
        unsubscribers.push(
            ctx.bus.handle('treesitter:extract-imports', (data) =>
                tsExtractImports(data as TsExtractImportsInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('treesitter:extract-refs', (data) =>
                tsExtractRefs(data as TsExtractRefsInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('treesitter:extract-calls', (data) =>
                tsExtractCalls(data as TsExtractCallsInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('treesitter:extract-outline', (data) =>
                tsExtractOutline(data as TsExtractOutlineInput),
            ),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
