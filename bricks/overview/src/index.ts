// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    ArchitectureInput,
    ConventionsInput,
    DependenciesInput,
    ProjectInput,
} from './operations.ts';
import { ovwArchitecture, ovwConventions, ovwDependencies, ovwProject } from './operations.ts';

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
            ctx.bus.handle('overview:project', (data) => ovwProject(data as ProjectInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('overview:architecture', (data) =>
                ovwArchitecture(data as ArchitectureInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('overview:conventions', (data) =>
                ovwConventions(data as ConventionsInput),
            ),
        );
        unsubscribers.push(
            ctx.bus.handle('overview:dependencies', (data) =>
                ovwDependencies(data as DependenciesInput),
            ),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
