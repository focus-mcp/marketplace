// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    KbFetchInput,
    KbIndexInput,
    KbPurgeInput,
    KbRankInput,
    KbSearchInput,
} from './operations.ts';
import { kbFetch, kbIndex, kbPurge, kbRank, kbSearch } from './operations.ts';

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
            ctx.bus.handle('knowledge:index', (data) => kbIndex(data as KbIndexInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('knowledge:search', (data) => kbSearch(data as KbSearchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('knowledge:fetch', (data) => kbFetch(data as KbFetchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('knowledge:purge', (data) => kbPurge(data as KbPurgeInput)),
        );
        unsubscribers.push(ctx.bus.handle('knowledge:rank', (data) => kbRank(data as KbRankInput)));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
