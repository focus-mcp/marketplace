// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import brick from './index.ts';

describe('filesystem composite brick', () => {
    it('has correct manifest', () => {
        expect(brick.manifest.name).toBe('filesystem');
        expect(brick.manifest.dependencies).toEqual([
            'fileread',
            'filewrite',
            'filelist',
            'fileops',
            'filesearch',
        ]);
        expect(brick.manifest.tools).toHaveLength(0);
    });

    it('start and stop are safe no-ops', async () => {
        const bus = { handle: vi.fn(), on: vi.fn() };
        await brick.start({ bus });
        expect(bus.handle).not.toHaveBeenCalled();
        await brick.stop();
    });
});
