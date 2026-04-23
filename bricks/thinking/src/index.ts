// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    ThkBranchInput,
    ThkReviseInput,
    ThkSummarizeInput,
    ThkThinkInput,
} from './operations.ts';
import { thkBranch, thkRevise, thkSummarize, thkThink } from './operations.ts';

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
            ctx.bus.handle('thinking:think', (data) => thkThink(data as ThkThinkInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('thinking:branch', (data) => thkBranch(data as ThkBranchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('thinking:revise', (data) => thkRevise(data as ThkReviseInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('thinking:summarize', (data) => thkSummarize(data as ThkSummarizeInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
