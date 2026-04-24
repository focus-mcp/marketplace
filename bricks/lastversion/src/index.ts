// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    LvAuditInput,
    LvChangelogInput,
    LvCheckInput,
    LvDiffInput,
    LvLatestInput,
    LvVersionsInput,
} from './operations.ts';
import { lvAudit, lvChangelog, lvCheck, lvDiff, lvLatest, lvVersions } from './operations.ts';

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
            ctx.bus.handle('lastversion:latest', (data) => lvLatest(data as LvLatestInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('lastversion:versions', (data) => lvVersions(data as LvVersionsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('lastversion:diff', (data) => lvDiff(data as LvDiffInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('lastversion:changelog', (data) =>
                lvChangelog(data as LvChangelogInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('lastversion:check', (data) => lvCheck(data as LvCheckInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('lastversion:audit', (data) => lvAudit(data as LvAuditInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
