// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type { FlFindInput, FlGlobInput, FlListInput, FlTreeInput } from './operations.ts';
import { flFind, flGlob, flList, flTree } from './operations.ts';

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
        unsubscribers.push(ctx.bus.handle('filelist:list', (data) => flList(data as FlListInput)));
        unsubscribers.push(ctx.bus.handle('filelist:tree', (data) => flTree(data as FlTreeInput)));
        unsubscribers.push(ctx.bus.handle('filelist:glob', (data) => flGlob(data as FlGlobInput)));
        unsubscribers.push(ctx.bus.handle('filelist:find', (data) => flFind(data as FlFindInput)));
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
