/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the codebase composite (meta-bundle) brick.
 *
 * codebase has no tools of its own (tools: []). It is a composite brick that
 * signals the runtime to load its dependency bricks: treesitter, symbol,
 * outline, callgraph, depgraph, refs. These tests validate the brick contract
 * (manifest shape, lifecycle safety) and serve as a documentary smoke signal.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('codebase composite brick — smoke', () => {
    it('manifest: name=codebase, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('codebase');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining([
                'treesitter',
                'symbol',
                'outline',
                'callgraph',
                'depgraph',
                'refs',
            ]),
        );
        expect(brick.manifest.dependencies).toHaveLength(6);
    });

    it('start() is a safe no-op — registers no bus handlers', async () => {
        const bus = { handle: vi.fn() };
        await brick.start({ bus });
        expect(bus.handle).not.toHaveBeenCalled();
    });

    it('stop() after start() is a safe no-op', async () => {
        const bus = { handle: vi.fn() };
        await brick.start({ bus });
        await brick.stop();
    });

    it('stop() without prior start() does not throw', async () => {
        await brick.stop();
    });
});
