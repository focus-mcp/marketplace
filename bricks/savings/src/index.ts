// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { SavCompareInput, SavReportInput, SavRoiInput, SavTrendInput } from './operations.ts';
import { savCompare, savReport, savRoi, savTrend } from './operations.ts';

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
            ctx.bus.handle('savings:report', (data) => savReport(data as SavReportInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('savings:compare', (data) => savCompare(data as SavCompareInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('savings:trend', (data) => savTrend(data as SavTrendInput)),
        );
        unsubscribers.push(ctx.bus.handle('savings:roi', (data) => savRoi(data as SavRoiInput)));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
