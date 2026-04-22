// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    AgtCapabilitiesInput,
    AgtListInput,
    AgtRegisterInput,
    AgtUnregisterInput,
} from './operations.ts';
import { agtCapabilities, agtList, agtRegister, agtUnregister } from './operations.ts';

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
            ctx.bus.handle('agent:register', (data) => agtRegister(data as AgtRegisterInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('agent:unregister', (data) => agtUnregister(data as AgtUnregisterInput)),
        );
        unsubscribers.push(ctx.bus.handle('agent:list', (data) => agtList(data as AgtListInput)));
        unsubscribers.push(
            ctx.bus.handle('agent:capabilities', (data) =>
                agtCapabilities(data as AgtCapabilitiesInput),
            ),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
