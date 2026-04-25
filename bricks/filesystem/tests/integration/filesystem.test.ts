/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the filesystem composite (meta-bundle) brick.
 *
 * filesystem has no tools of its own (tools: []). It is a composite brick that
 * signals the runtime to load its dependency bricks: fileread, filewrite,
 * filelist, fileops, filesearch. These tests validate the brick contract
 * (manifest shape, lifecycle safety) and serve as a documentary smoke signal.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('filesystem composite brick — smoke', () => {
    it('manifest: name=filesystem, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('filesystem');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining(['fileread', 'filewrite', 'filelist', 'fileops', 'filesearch']),
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
