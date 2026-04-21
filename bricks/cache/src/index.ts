// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    CacheGetInput,
    CacheInvalidateInput,
    CacheSetInput,
    CacheWarmupInput,
} from './operations.ts';
import { cacheGet, cacheInvalidate, cacheSet, cacheStats, cacheWarmup } from './operations.ts';

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
        unsubscribers.push(ctx.bus.handle('cache:get', (data) => cacheGet(data as CacheGetInput)));
        unsubscribers.push(ctx.bus.handle('cache:set', (data) => cacheSet(data as CacheSetInput)));
        unsubscribers.push(
            ctx.bus.handle('cache:invalidate', (data) =>
                cacheInvalidate(data as CacheInvalidateInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('cache:warmup', (data) => cacheWarmup(data as CacheWarmupInput)),
        );
        unsubscribers.push(ctx.bus.handle('cache:stats', () => cacheStats()));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
