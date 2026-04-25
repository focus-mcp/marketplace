/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the devtools composite (meta-bundle) brick.
 *
 * devtools has no tools of its own (tools: []). It is a composite brick that
 * signals the runtime to load its dependency bricks: shell, sandbox, batch.
 * These tests validate the brick contract (manifest shape, lifecycle safety)
 * and serve as a documentary smoke signal.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('devtools composite brick — smoke', () => {
    it('manifest: name=devtools, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('devtools');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining(['shell', 'sandbox', 'batch']),
        );
        expect(brick.manifest.dependencies).toHaveLength(3);
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
