/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

export interface BrickLike {
    manifest: { name: string; prefix: string; tools: unknown[] };
    handlers: Record<string, (input: unknown) => Promise<unknown>>;
}

/**
 * Direct-call invocation of a brick tool handler.
 * No MCP transport, no LLM — suitable for integration tests.
 */
export async function runTool<TInput, TOutput>(
    brick: BrickLike,
    toolName: string,
    input: TInput,
): Promise<TOutput> {
    const key = `${brick.manifest.name}:${toolName}`;
    const handler = brick.handlers[key];
    if (!handler) {
        throw new Error(`No handler registered for "${key}"`);
    }
    return (await handler(input)) as TOutput;
}
