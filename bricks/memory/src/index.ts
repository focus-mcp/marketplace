// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    MemForgetInput,
    MemListInput,
    MemRecallInput,
    MemSearchInput,
    MemStoreInput,
} from './operations.ts';
import { memForget, memList, memRecall, memSearch, memStore } from './operations.ts';

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
            ctx.bus.handle('memory:store', (data) => memStore(data as MemStoreInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('memory:recall', (data) => memRecall(data as MemRecallInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('memory:search', (data) => memSearch(data as MemSearchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('memory:forget', (data) => memForget(data as MemForgetInput)),
        );
        unsubscribers.push(ctx.bus.handle('memory:list', (data) => memList(data as MemListInput)));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
