// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { ShBackgroundInput, ShCompressInput, ShExecInput, ShKillInput } from './operations.ts';
import { killAllBackground, shBackground, shCompress, shExec, shKill } from './operations.ts';

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

        unsubscribers.push(ctx.bus.handle('shell:exec', (data) => shExec(data as ShExecInput)));
        unsubscribers.push(
            ctx.bus.handle('shell:background', (data) => shBackground(data as ShBackgroundInput)),
        );
        unsubscribers.push(ctx.bus.handle('shell:kill', (data) => shKill(data as ShKillInput)));
        unsubscribers.push(
            ctx.bus.handle('shell:compress', (data) => shCompress(data as ShCompressInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
        // Kill all remaining background processes
        killAllBackground();
    },
};

export default brick;
