// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    TskAssignInput,
    TskCompleteInput,
    TskCreateInput,
    TskStatusInput,
} from './operations.ts';
import { tskAssign, tskComplete, tskCreate, tskStatus } from './operations.ts';

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
            ctx.bus.handle('task:create', (data) => tskCreate(data as TskCreateInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('task:assign', (data) => tskAssign(data as TskAssignInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('task:status', (data) => tskStatus(data as TskStatusInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('task:complete', (data) => tskComplete(data as TskCompleteInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
