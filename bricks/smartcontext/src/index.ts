// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { LoadInput, RefreshInput, SmartContextBus } from './operations.ts';
import { sctxLoad, sctxRefresh, sctxStatus } from './operations.ts';

interface BrickBus {
    on(
        event: string,
        handler: (data: unknown) => Promise<unknown> | unknown,
    ): undefined | (() => void);
    handle(target: string, handler: (data: unknown) => Promise<unknown> | unknown): () => void;
    request(target: string, data: unknown): Promise<unknown>;
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
        const bus: SmartContextBus = ctx.bus;
        unsubscribers.push(
            ctx.bus.handle('smartcontext:load', (data) => sctxLoad(data as LoadInput, bus)),
        );
        unsubscribers.push(
            ctx.bus.handle('smartcontext:refresh', (data) =>
                sctxRefresh(data as RefreshInput, bus),
            ),
        );
        unsubscribers.push(ctx.bus.handle('smartcontext:status', () => sctxStatus(bus)));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
