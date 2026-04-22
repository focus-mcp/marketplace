// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    PlanCreateInput,
    PlanDependenciesInput,
    PlanEstimateInput,
    PlanStepsInput,
} from './operations.ts';
import { planCreate, planDependencies, planEstimate, planSteps } from './operations.ts';

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
            ctx.bus.handle('planning:create', (data) => planCreate(data as PlanCreateInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('planning:steps', (data) => planSteps(data as PlanStepsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('planning:dependencies', (data) =>
                planDependencies(data as PlanDependenciesInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('planning:estimate', (data) => planEstimate(data as PlanEstimateInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
