/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the codemod composite (meta-bundle) brick.
 *
 * codemod has no tools of its own (tools: []). It is a composite brick that
 * signals the runtime to load its dependency bricks: symbol, rename, codeedit,
 * inline, textsearch. These tests validate the brick contract (manifest shape,
 * lifecycle safety) and serve as a documentary smoke signal.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('codemod composite brick — smoke', () => {
    it('manifest: name=codemod, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('codemod');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining(['symbol', 'rename', 'codeedit', 'inline', 'textsearch']),
        );
        expect(brick.manifest.dependencies).toHaveLength(5);
    });

    it('start() is a safe no-op — registers no bus handlers', async () => {
        const bus = { handle: vi.fn(), on: vi.fn() };
        await brick.start({ bus });
        expect(bus.handle).not.toHaveBeenCalled();
    });

    it('stop() after start() is a safe no-op', async () => {
        const bus = { handle: vi.fn(), on: vi.fn() };
        await brick.start({ bus });
        await expect(Promise.resolve(brick.stop())).resolves.toBeUndefined();
    });

    it('stop() without prior start() does not throw', async () => {
        await expect(Promise.resolve(brick.stop())).resolves.toBeUndefined();
    });
});
