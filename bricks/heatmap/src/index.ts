// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    HmColdfilesInput,
    HmHotfilesInput,
    HmPatternsInput,
    HmTrackInput,
} from './operations.ts';
import { hmColdfiles, hmHotfiles, hmPatterns, hmTrack } from './operations.ts';

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
            ctx.bus.handle('heatmap:track', (data) => hmTrack(data as HmTrackInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('heatmap:hotfiles', (data) => hmHotfiles(data as HmHotfilesInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('heatmap:patterns', (data) => hmPatterns(data as HmPatternsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('heatmap:coldfiles', (data) => hmColdfiles(data as HmColdfilesInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
