// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    DepCircularInput,
    DepExportsInput,
    DepFaninInput,
    DepFanoutInput,
    DepImportsInput,
} from './operations.ts';
import { depCircular, depExports, depFanin, depFanout, depImports } from './operations.ts';

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
            ctx.bus.handle('depgraph:imports', (data) => depImports(data as DepImportsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('depgraph:exports', (data) => depExports(data as DepExportsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('depgraph:circular', (data) => depCircular(data as DepCircularInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('depgraph:fanin', (data) => depFanin(data as DepFaninInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('depgraph:fanout', (data) => depFanout(data as DepFanoutInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
