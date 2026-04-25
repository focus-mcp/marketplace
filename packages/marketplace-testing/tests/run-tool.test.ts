/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { describe, expect, it } from 'vitest';
import { runTool } from '../src/run-tool.js';

describe('runTool', () => {
    it('dispatches a call to the named brick handler and returns its output', async () => {
        const fakeBrick = {
            manifest: { name: 'echo', prefix: 'ec', tools: [{ name: 'say', inputSchema: {} }] },
            async start() {
                return this;
            },
            async stop() {},
            handlers: {
                'echo:say': async (input: { text: string }) => ({ content: input.text }),
            },
        };
        const result = await runTool(fakeBrick, 'say', { text: 'hello' });
        expect(result).toEqual({ content: 'hello' });
    });

    it('throws a clear error when the handler is not registered', async () => {
        const fakeBrick = {
            manifest: { name: 'noop', prefix: 'no', tools: [] },
            async start() {
                return this;
            },
            async stop() {},
            handlers: {},
        };
        await expect(runTool(fakeBrick, 'missing', {})).rejects.toThrow(
            /no handler registered for "noop:missing"/i,
        );
    });
});
