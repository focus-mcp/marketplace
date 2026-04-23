// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hmColdfiles, hmHotfiles, hmPatterns, hmTrack, resetHeatmap } from './operations.ts';

beforeEach(() => {
    resetHeatmap();
});

afterEach(() => {
    resetHeatmap();
    vi.useRealTimers();
});

// ─── hmTrack ─────────────────────────────────────────────────────────────────

describe('hmTrack', () => {
    it('records a read access and returns totalAccesses = 1', () => {
        const result = hmTrack({ file: '/src/main.ts', type: 'read' });
        expect(result.file).toBe('/src/main.ts');
        expect(result.totalAccesses).toBe(1);
    });

    it('records a write access and returns totalAccesses = 1', () => {
        const result = hmTrack({ file: '/src/main.ts', type: 'write' });
        expect(result.totalAccesses).toBe(1);
    });

    it('accumulates accesses across multiple calls', () => {
        hmTrack({ file: '/src/main.ts', type: 'read' });
        hmTrack({ file: '/src/main.ts', type: 'read' });
        const result = hmTrack({ file: '/src/main.ts', type: 'write' });
        expect(result.totalAccesses).toBe(3);
    });

    it('tracks different files independently', () => {
        const a = hmTrack({ file: '/src/a.ts', type: 'read' });
        const b = hmTrack({ file: '/src/b.ts', type: 'write' });
        expect(a.totalAccesses).toBe(1);
        expect(b.totalAccesses).toBe(1);
    });
});

// ─── hmHotfiles ──────────────────────────────────────────────────────────────

describe('hmHotfiles', () => {
    it('returns empty list when no accesses', () => {
        const result = hmHotfiles({});
        expect(result.files).toHaveLength(0);
    });

    it('returns files sorted by combined count descending', () => {
        hmTrack({ file: '/src/b.ts', type: 'read' });
        hmTrack({ file: '/src/a.ts', type: 'read' });
        hmTrack({ file: '/src/a.ts', type: 'write' });
        const result = hmHotfiles({});
        expect(result.files[0]?.file).toBe('/src/a.ts');
        expect(result.files[0]?.count).toBe(2);
    });

    it('respects the limit parameter', () => {
        for (let i = 0; i < 5; i++) {
            hmTrack({ file: `/src/file${i}.ts`, type: 'read' });
        }
        const result = hmHotfiles({ limit: 3 });
        expect(result.files).toHaveLength(3);
    });

    it('filters by type=read', () => {
        hmTrack({ file: '/src/a.ts', type: 'read' });
        hmTrack({ file: '/src/a.ts', type: 'read' });
        hmTrack({ file: '/src/b.ts', type: 'write' });
        const result = hmHotfiles({ type: 'read' });
        expect(result.files.every((f) => f.count > 0)).toBe(true);
        expect(result.files.find((f) => f.file === '/src/b.ts')).toBeUndefined();
    });

    it('filters by type=write', () => {
        hmTrack({ file: '/src/a.ts', type: 'read' });
        hmTrack({ file: '/src/b.ts', type: 'write' });
        hmTrack({ file: '/src/b.ts', type: 'write' });
        const result = hmHotfiles({ type: 'write' });
        expect(result.files[0]?.file).toBe('/src/b.ts');
        expect(result.files[0]?.count).toBe(2);
        expect(result.files.find((f) => f.file === '/src/a.ts')).toBeUndefined();
    });

    it('includes lastAccess timestamp in entries', () => {
        hmTrack({ file: '/src/a.ts', type: 'read' });
        const result = hmHotfiles({});
        expect(result.files[0]?.lastAccess).toBeTypeOf('number');
        expect(result.files[0]?.lastAccess).toBeGreaterThan(0);
    });
});

// ─── hmPatterns ──────────────────────────────────────────────────────────────

describe('hmPatterns', () => {
    it('returns empty coAccessed when no accesses', () => {
        const result = hmPatterns({});
        expect(result.coAccessed).toHaveLength(0);
    });

    it('detects files accessed within 1 second of each other', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now + 500);
        hmTrack({ file: '/src/b.ts', type: 'read' });

        const result = hmPatterns({});
        expect(result.coAccessed).toHaveLength(1);
        expect(result.coAccessed[0]?.files).toContain('/src/a.ts');
        expect(result.coAccessed[0]?.files).toContain('/src/b.ts');
        expect(result.coAccessed[0]?.count).toBe(1);
    });

    it('does not link files accessed more than 1 second apart', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now + 2_000);
        hmTrack({ file: '/src/b.ts', type: 'read' });

        const result = hmPatterns({});
        expect(result.coAccessed).toHaveLength(0);
    });

    it('accumulates co-access count across multiple windows', () => {
        vi.useFakeTimers();
        const now = Date.now();

        vi.setSystemTime(now);
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now + 200);
        hmTrack({ file: '/src/b.ts', type: 'read' });

        vi.setSystemTime(now + 5_000);
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now + 5_200);
        hmTrack({ file: '/src/b.ts', type: 'read' });

        const result = hmPatterns({});
        const pair = result.coAccessed.find(
            (e) => e.files.includes('/src/a.ts') && e.files.includes('/src/b.ts'),
        );
        expect(pair?.count).toBe(2);
    });

    it('does not create a self-pair', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now);
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now + 100);
        hmTrack({ file: '/src/a.ts', type: 'write' });

        const result = hmPatterns({});
        expect(result.coAccessed).toHaveLength(0);
    });
});

// ─── hmColdfiles ─────────────────────────────────────────────────────────────

describe('hmColdfiles', () => {
    it('returns empty when no accesses', () => {
        const result = hmColdfiles({});
        expect(result.files).toHaveLength(0);
        expect(result.count).toBe(0);
    });

    it('returns files not accessed within the threshold', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now - 7_200_000); // 2 hours ago
        hmTrack({ file: '/src/old.ts', type: 'read' });
        vi.setSystemTime(now);
        hmTrack({ file: '/src/new.ts', type: 'read' });

        const result = hmColdfiles({ threshold: 3_600_000 });
        expect(result.files).toContain('/src/old.ts');
        expect(result.files).not.toContain('/src/new.ts');
        expect(result.count).toBe(1);
    });

    it('uses default threshold of 1 hour', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now - 4_000_000); // > 1 hour ago
        hmTrack({ file: '/src/stale.ts', type: 'read' });
        vi.setSystemTime(now);

        const result = hmColdfiles({});
        expect(result.files).toContain('/src/stale.ts');
    });

    it('excludes recently accessed files', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now - 60_000); // 1 minute ago
        hmTrack({ file: '/src/recent.ts', type: 'read' });
        vi.setSystemTime(now);

        const result = hmColdfiles({ threshold: 3_600_000 });
        expect(result.files).not.toContain('/src/recent.ts');
    });

    it('returns files sorted alphabetically', () => {
        vi.useFakeTimers();
        const now = Date.now();
        vi.setSystemTime(now - 7_200_000);
        hmTrack({ file: '/src/z.ts', type: 'read' });
        hmTrack({ file: '/src/a.ts', type: 'read' });
        vi.setSystemTime(now);

        const result = hmColdfiles({ threshold: 3_600_000 });
        expect(result.files[0]).toBe('/src/a.ts');
        expect(result.files[1]).toBe('/src/z.ts');
    });
});

// ─── brick lifecycle ─────────────────────────────────────────────────────────

describe('heatmap brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('heatmap:track', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('heatmap:hotfiles', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('heatmap:patterns', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('heatmap:coldfiles', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
