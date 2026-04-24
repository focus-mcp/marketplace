// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    FoBatchInput,
    FoCopyInput,
    FoDeleteInput,
    FoMoveInput,
    FoRenameInput,
} from './operations.ts';
import { foBatch, foCopy, foDelete, foMove, foRename, setWorkRoot } from './operations.ts';

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
        unsubscribers.push(ctx.bus.handle('fileops:move', (data) => foMove(data as FoMoveInput)));
        unsubscribers.push(ctx.bus.handle('fileops:copy', (data) => foCopy(data as FoCopyInput)));
        unsubscribers.push(
            ctx.bus.handle('fileops:delete', (data) => foDelete(data as FoDeleteInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('fileops:rename', (data) => foRename(data as FoRenameInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('fileops:batch', (data) => foBatch(data as FoBatchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('fileops:setRoot', (data) => {
                const { root } = data as { root: string };
                setWorkRoot(root);
                return { root };
            }),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
