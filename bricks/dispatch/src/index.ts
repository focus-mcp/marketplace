// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { DspCancelInput, DspQueueInput, DspSendInput, DspStatusInput } from './operations.ts';
import { dspCancel, dspQueue, dspSend, dspStatus } from './operations.ts';

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
            ctx.bus.handle('dispatch:send', (data) => dspSend(data as DspSendInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('dispatch:queue', (data) => dspQueue(data as DspQueueInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('dispatch:cancel', (data) => dspCancel(data as DspCancelInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('dispatch:status', (data) => dspStatus(data as DspStatusInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
