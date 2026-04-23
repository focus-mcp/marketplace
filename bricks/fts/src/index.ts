// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { FtsIndexInput, FtsRankInput, FtsSearchInput, FtsSuggestInput } from './operations.ts';
import { ftsIndex, ftsRank, ftsSearch, ftsSuggest } from './operations.ts';

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
        unsubscribers.push(ctx.bus.handle('fts:index', (data) => ftsIndex(data as FtsIndexInput)));
        unsubscribers.push(
            ctx.bus.handle('fts:search', (data) => ftsSearch(data as FtsSearchInput)),
        );
        unsubscribers.push(ctx.bus.handle('fts:rank', (data) => ftsRank(data as FtsRankInput)));
        unsubscribers.push(
            ctx.bus.handle('fts:suggest', (data) => ftsSuggest(data as FtsSuggestInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
