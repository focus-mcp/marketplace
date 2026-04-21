// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { SrInput } from './operations.ts';
import { srFull, srImports, srMap, srSignatures, srSummary } from './operations.ts';

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
    readonly version: string;
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
        unsubscribers.push(ctx.bus.handle('smartread:full', (data) => srFull(data as SrInput)));
        unsubscribers.push(ctx.bus.handle('smartread:map', (data) => srMap(data as SrInput)));
        unsubscribers.push(
            ctx.bus.handle('smartread:signatures', (data) => srSignatures(data as SrInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('smartread:imports', (data) => srImports(data as SrInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('smartread:summary', (data) => srSummary(data as SrInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
