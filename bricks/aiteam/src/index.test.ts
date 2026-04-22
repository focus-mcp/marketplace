// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import brick from './index.ts';

describe('aiteam composite brick', () => {
    it('has correct manifest', () => {
        expect(brick.manifest.name).toBe('aiteam');
        expect(brick.manifest.dependencies).toEqual([
            'dispatch',
            'parallel',
            'debate',
            'review',
            'agent',
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
