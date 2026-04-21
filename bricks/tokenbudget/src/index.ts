// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { AnalyzeInput, EstimateInput, FillInput, OptimizeInput } from './operations.ts';
import { tbAnalyze, tbEstimate, tbFill, tbOptimize } from './operations.ts';

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
        unsubscribers.push(
            ctx.bus.handle('tokenbudget:estimate', (data) => tbEstimate(data as EstimateInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('tokenbudget:analyze', (data) => tbAnalyze(data as AnalyzeInput)),
        );
        unsubscribers.push(ctx.bus.handle('tokenbudget:fill', (data) => tbFill(data as FillInput)));
        unsubscribers.push(
            ctx.bus.handle('tokenbudget:optimize', (data) => tbOptimize(data as OptimizeInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
