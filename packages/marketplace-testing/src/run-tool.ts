/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

export interface BrickLike {
    manifest: { name: string; prefix: string; tools: unknown[] };
    /** Static handler map — optional when the brick uses start(ctx) shape. */
    handlers?: Record<string, (input: unknown) => Promise<unknown>>;
    /** Bus-based start/stop lifecycle — alternative to static handlers. */
    start?: (ctx: { bus: BusBridge }) => Promise<void> | void;
    stop?: () => Promise<void> | void;
}

/** Minimal bus interface used to capture handlers at test time. */
export interface BusBridge {
    handle(target: string, handler: (data: unknown) => Promise<unknown> | unknown): () => void;
    on(
        event: string,
        handler: (data: unknown) => Promise<unknown> | unknown,
    ): undefined | (() => void);
}

/**
 * Direct-call invocation of a brick tool handler.
 * No MCP transport, no LLM — suitable for integration tests.
 *
 * Supports two brick shapes:
 *  1. Static handlers map: `brick.handlers[key]`
 *  2. Bus-based lifecycle:  `brick.start(ctx)` registers handlers via ctx.bus.handle
 */
export async function runTool<TInput, TOutput>(
    brick: BrickLike,
    toolName: string,
    input: TInput,
): Promise<TOutput> {
    const key = `${brick.manifest.name}:${toolName}`;

    // Shape 1: static handlers map
    if (brick.handlers) {
        const handler = brick.handlers[key];
        if (!handler) {
            throw new Error(`No handler registered for "${key}"`);
        }
        return (await handler(input)) as TOutput;
    }

    // Shape 2: start(ctx) lifecycle — capture handlers via bus bridge
    if (brick.start) {
        const captured: Record<string, (data: unknown) => Promise<unknown> | unknown> = {};
        const bus: BusBridge = {
            handle(target, handler) {
                captured[target] = handler;
                return () => {
                    delete captured[target];
                };
            },
            on(_event, _handler) {
                return undefined;
            },
        };
        await brick.start({ bus });
        const handler = captured[key];
        if (!handler) {
            throw new Error(`No handler registered for "${key}" after start()`);
        }
        return (await handler(input)) as TOutput;
    }

    throw new Error(`Brick "${brick.manifest.name}" has neither handlers nor start()`);
}
