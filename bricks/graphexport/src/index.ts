// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import type {
    GeCypherInput,
    GeGraphmlInput,
    GeHtmlInput,
    GeInputInput,
    GeMermaidInput,
    GeObsidianInput,
    GeWikiInput,
} from './operations.ts';
import {
    geCypher,
    geGraphml,
    geHtml,
    geInput,
    geMermaid,
    geObsidian,
    geWiki,
} from './operations.ts';

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
            ctx.bus.handle('graphexport:input', (data) => geInput(data as GeInputInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:html', (data) => geHtml(data as GeHtmlInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:mermaid', (data) => geMermaid(data as GeMermaidInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:graphml', (data) => geGraphml(data as GeGraphmlInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:cypher', (data) => geCypher(data as GeCypherInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:obsidian', (data) => geObsidian(data as GeObsidianInput)),
        );
        unsubscribers.push(
            ctx.bus.handle('graphexport:wiki', (data) => geWiki(data as GeWikiInput)),
        );
    },
    stop() {
        for (const unsub of unsubscribers) unsub();
        unsubscribers.length = 0;
    },
};

export default brick;
