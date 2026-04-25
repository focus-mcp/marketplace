/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 *
 * Smoke tests for the knowledgebase composite (meta-bundle) brick.
 *
 * knowledgebase has no tools of its own (tools: []). It is a composite brick
 * that signals the runtime to load its dependency bricks: knowledge, fts,
 * graphbuild, graphquery. These tests validate the brick contract (manifest
 * shape, lifecycle safety) and serve as a documentary smoke signal.
 */
import { describe, expect, it, vi } from 'vitest';
import brick from '../../src/index.js';

describe('knowledgebase composite brick — smoke', () => {
    it('manifest: name=knowledgebase, tools=[], expected dependencies', () => {
        expect(brick.manifest.name).toBe('knowledgebase');
        expect(brick.manifest.tools).toHaveLength(0);
        expect(brick.manifest.dependencies).toEqual(
            expect.arrayContaining(['knowledge', 'fts', 'graphbuild', 'graphquery']),
        );
        expect(brick.manifest.dependencies).toHaveLength(4);
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
