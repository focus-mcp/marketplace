// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { ExecuteInput, PlanInput, StatusInput } from './operations.ts';
import { autoExecute, autoPlan, autoStatus } from './operations.ts';

// ─── Bus / context interfaces ─────────────────────────────────────────────────

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

// ─── Brick ────────────────────────────────────────────────────────────────────

const unsubscribers: Array<() => void> = [];

const brick: Brick = {
    manifest: manifestJson,
    start(ctx) {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;

        unsubscribers.push(ctx.bus.handle('autopilot:plan', (data) => autoPlan(data as PlanInput)));
        unsubscribers.push(
            ctx.bus.handle('autopilot:execute', (data) => autoExecute(data as ExecuteInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('autopilot:status', (data) => autoStatus(data as StatusInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
