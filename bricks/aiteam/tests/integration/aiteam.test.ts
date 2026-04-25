/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the aiteam composite (meta-bundle) brick.
 *
 * aiteam has no tools of its own (tools: []). It is a composite brick that
 * signals the runtime to load its dependency bricks: dispatch, parallel,
 * debate, review, agent. There is nothing to invoke via runTool here —
 * these tests validate the brick contract (manifest shape, lifecycle safety)
 * and serve as a documentary smoke signal that the module loads without error.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('aiteam composite brick — smoke', () => {
    it('manifest: name=aiteam, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('aiteam');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining(['dispatch', 'parallel', 'debate', 'review', 'agent']),
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
