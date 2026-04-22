// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { ParCollectInput, ParMergeInput, ParRunInput, ParTimeoutInput } from './operations.ts';
import { parCollect, parMerge, parRun, parTimeout } from './operations.ts';

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
        unsubscribers.push(ctx.bus.handle('parallel:run', (data) => parRun(data as ParRunInput)));
        unsubscribers.push(
            ctx.bus.handle('parallel:collect', (data) => parCollect(data as ParCollectInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('parallel:merge', (data) => parMerge(data as ParMergeInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('parallel:timeout', (data) => parTimeout(data as ParTimeoutInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
