// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    FsDeleteInput,
    FsListInput,
    FsReadInput,
    FsSearchInput,
    FsWriteInput,
} from './operations.ts';
import { fsDelete, fsList, fsRead, fsSearch, fsWrite } from './operations.ts';

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
            ctx.bus.handle('filesystem:read', (data) => fsRead(data as FsReadInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('filesystem:write', (data) => fsWrite(data as FsWriteInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('filesystem:list', (data) => fsList(data as FsListInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('filesystem:search', (data) => fsSearch(data as FsSearchInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('filesystem:delete', (data) => fsDelete(data as FsDeleteInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
