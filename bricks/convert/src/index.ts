// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    ConvEncodingInput,
    ConvFormatInput,
    ConvLanguageInput,
    ConvUnitsInput,
} from './operations.ts';
import { convEncoding, convFormat, convLanguage, convUnits } from './operations.ts';

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
            ctx.bus.handle('convert:units', (data) => convUnits(data as ConvUnitsInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('convert:encoding', (data) => convEncoding(data as ConvEncodingInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('convert:format', (data) => convFormat(data as ConvFormatInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('convert:language', (data) => convLanguage(data as ConvLanguageInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
