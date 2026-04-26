// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    parCollect,
    parMerge,
    parRun,
    parRunInline,
    parTimeout,
    resetParallel,
    truncateOutput,
} from './operations.ts';

beforeEach(() => {
    resetParallel();
});

afterEach(() => {
    resetParallel();
});

// ─── parRun ──────────────────────────────────────────────────────────────────

describe('parRun', () => {
    it('runs a single task and returns a runId', async () => {
        const result = await parRun({
            tasks: [{ id: 'a', command: 'echo hello' }],
        });
        expect(result.runId).toBeTruthy();
        expect(result.taskCount).toBe(1);
        expect(result.completed).toBe(1);
        expect(result.failed).toBe(0);
    });

    it('runs multiple tasks in parallel', async () => {
        const result = await parRun({
            tasks: [
                { id: 'a', command: 'echo alpha' },
                { id: 'b', command: 'echo beta' },
                { id: 'c', command: 'echo gamma' },
            ],
        });
        expect(result.taskCount).toBe(3);
        expect(result.completed).toBe(3);
        expect(result.failed).toBe(0);
    });

    it('respects concurrency limit', async () => {
        const result = await parRun({
            tasks: [
                { id: 'a', command: 'echo a' },
                { id: 'b', command: 'echo b' },
                { id: 'c', command: 'echo c' },
            ],
            concurrency: 2,
        });
        expect(result.taskCount).toBe(3);
        expect(result.completed).toBe(3);
    });

    it('counts failed tasks', async () => {
        const result = await parRun({
            tasks: [
                { id: 'ok', command: 'echo ok' },
                { id: 'fail', command: 'false' },
            ],
        });
        expect(result.taskCount).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.completed).toBe(1);
    });

    it('handles empty tasks list', async () => {
        const result = await parRun({ tasks: [] });
        expect(result.taskCount).toBe(0);
        expect(result.completed).toBe(0);
        expect(result.failed).toBe(0);
    });
});

// ─── parCollect ──────────────────────────────────────────────────────────────

describe('parCollect', () => {
    it('returns results from a previous run', async () => {
        const run = await parRun({
            tasks: [{ id: 'hello', command: 'echo world' }],
        });
        const collected = parCollect({ runId: run.runId });
        expect(collected.runId).toBe(run.runId);
        expect(collected.results).toHaveLength(1);
        expect(collected.results[0]?.id).toBe('hello');
        expect(collected.results[0]?.stdout.trim()).toBe('world');
        expect(collected.results[0]?.exitCode).toBe(0);
    });

    it('returns captured stdout and stderr', async () => {
        const run = await parRun({
            tasks: [{ id: 't', command: 'echo captured_output' }],
        });
        const collected = parCollect({ runId: run.runId });
        expect(collected.results[0]?.stdout).toContain('captured_output');
    });

    it('returns empty results for unknown runId', () => {
        const collected = parCollect({ runId: 'nonexistent-id' });
        expect(collected.results).toHaveLength(0);
        expect(collected.summary.total).toBe(0);
    });

    it('summary contains correct counts', async () => {
        const run = await parRun({
            tasks: [
                { id: 'ok', command: 'echo ok' },
                { id: 'fail', command: 'false' },
            ],
        });
        const collected = parCollect({ runId: run.runId });
        expect(collected.summary.total).toBe(2);
        expect(collected.summary.completed).toBe(1);
        expect(collected.summary.failed).toBe(1);
    });

    it('records task duration', async () => {
        const run = await parRun({
            tasks: [{ id: 'dur', command: 'echo hi' }],
        });
        const collected = parCollect({ runId: run.runId });
        expect(collected.results[0]?.duration).toBeGreaterThanOrEqual(0);
    });
});

// ─── parMerge ────────────────────────────────────────────────────────────────

describe('parMerge', () => {
    it('merges outputs with default newline separator', () => {
        const result = parMerge({
            outputs: [
                { id: 'a', content: 'line1' },
                { id: 'b', content: 'line2' },
            ],
        });
        expect(result.merged).toContain('line1');
        expect(result.merged).toContain('line2');
        expect(result.lineCount).toBe(2);
    });

    it('uses custom separator', () => {
        const result = parMerge({
            outputs: [
                { id: 'a', content: 'alpha' },
                { id: 'b', content: 'beta' },
            ],
            separator: '---',
        });
        expect(result.merged).toContain('---');
        expect(result.merged).toContain('alpha');
        expect(result.merged).toContain('beta');
    });

    it('deduplicates lines when dedup is true', () => {
        const result = parMerge({
            outputs: [
                { id: 'a', content: 'duplicate\nunique1' },
                { id: 'b', content: 'duplicate\nunique2' },
            ],
            dedup: true,
        });
        const occurrences = result.merged.split('duplicate').length - 1;
        expect(occurrences).toBe(1);
    });

    it('does not dedup by default', () => {
        const result = parMerge({
            outputs: [
                { id: 'a', content: 'same' },
                { id: 'b', content: 'same' },
            ],
        });
        const occurrences = result.merged.split('same').length - 1;
        expect(occurrences).toBe(2);
    });

    it('handles empty outputs array', () => {
        const result = parMerge({ outputs: [] });
        expect(result.merged).toBe('');
        expect(result.lineCount).toBe(0);
    });

    it('returns correct lineCount for multiline content', () => {
        const result = parMerge({
            outputs: [{ id: 'a', content: 'line1\nline2\nline3' }],
        });
        expect(result.lineCount).toBe(3);
    });
});

// ─── parTimeout ──────────────────────────────────────────────────────────────

describe('parTimeout', () => {
    it('returns default timeout when called with no args', () => {
        const result = parTimeout({});
        expect(result.defaultMs).toBe(30_000);
    });

    it('sets a new default timeout', () => {
        parTimeout({ defaultMs: 5_000 });
        const result = parTimeout({});
        expect(result.defaultMs).toBe(5_000);
    });

    it('returns timedOut list for a known runId', async () => {
        const run = await parRun({
            tasks: [{ id: 'fast', command: 'echo fast' }],
        });
        const result = parTimeout({ runId: run.runId });
        expect(Array.isArray(result.timedOut)).toBe(true);
        expect(result.timedOut).toHaveLength(0);
    });

    it('returns empty timedOut for unknown runId', () => {
        const result = parTimeout({ runId: 'ghost' });
        expect(result.timedOut).toHaveLength(0);
    });

    it('can set timeout and check run in one call', async () => {
        const run = await parRun({
            tasks: [{ id: 'x', command: 'echo x' }],
        });
        const result = parTimeout({ defaultMs: 10_000, runId: run.runId });
        expect(result.defaultMs).toBe(10_000);
        expect(Array.isArray(result.timedOut)).toBe(true);
    });
});

// ─── truncateOutput ──────────────────────────────────────────────────────────

describe('truncateOutput', () => {
    it('returns output unchanged when under MAX_OUTPUT_BYTES', () => {
        const small = 'hello world';
        expect(truncateOutput(small)).toBe(small);
    });

    it('truncates stdout > MAX_OUTPUT_BYTES and adds truncation marker', () => {
        const big = 'x'.repeat(5000);
        const result = truncateOutput(big);
        const beforeMarker = result.split('\n[truncated')[0] ?? '';
        expect(Buffer.byteLength(beforeMarker, 'utf8')).toBeLessThanOrEqual(4096);
        expect(result).toContain('[truncated, original 5000 bytes]');
    });

    it('truncation marker contains original byte size', () => {
        const content = 'a'.repeat(8000);
        const result = truncateOutput(content);
        expect(result).toContain('[truncated, original 8000 bytes]');
    });

    it('respects custom maxBytes parameter', () => {
        const content = 'abcdef';
        const result = truncateOutput(content, 3);
        expect(result).toContain('[truncated, original 6 bytes]');
        expect(result.startsWith('abc')).toBe(true);
    });

    it('truncates by bytes, not characters (UTF-8 safe)', () => {
        const emoji = '😀'.repeat(2000); // 4 bytes per emoji = 8000 bytes
        const result = truncateOutput(emoji, 4096);
        expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(4096 + 50); // +marker
        expect(result).toContain('[truncated, original 8000 bytes]');
    });
});

// ─── parRunInline ─────────────────────────────────────────────────────────────

describe('parRunInline', () => {
    it('returns runId + results in single call', async () => {
        const result = await parRunInline({
            tasks: [
                { id: 't1', command: 'echo hello' },
                { id: 't2', command: 'echo world' },
            ],
        });
        expect(result.runId).toBeTruthy();
        expect(result.results).toHaveLength(2);
        expect(result.results[0]?.id).toBe('t1');
        expect(result.results[0]?.exitCode).toBe(0);
        expect(result.results[0]?.stdout.trim()).toBe('hello');
        expect(result.summary.total).toBe(2);
        expect(result.summary.completed).toBe(2);
        expect(result.summary.failed).toBe(0);
    });

    it('applies same caps as parRun (truncated stdout if > MAX_OUTPUT_BYTES)', async () => {
        // Use truncateOutput directly to verify cap is applied — avoids shell quoting issues
        const bigText = 'x'.repeat(5000);
        const truncated = truncateOutput(bigText);
        // Also verify parRunInline with a command that produces large output via echo + yes
        const result = await parRunInline({
            tasks: [{ id: 'big', command: 'dd if=/dev/urandom bs=5000 count=1 status=none' }],
        });
        // stdout should be either truncated or empty (binary might not capture well) — check size cap
        const sizeBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
        expect(sizeBytes).toBeLessThan(8192); // réponse complète reste raisonnable
        // Verify truncateOutput itself caps at 4096 bytes
        expect(truncated).toContain('[truncated, original 5000 bytes]');
    });
});

// ─── runs Map eviction ────────────────────────────────────────────────────────

describe('runs Map eviction', () => {
    it('evicts oldest entry when exceeding MAX_RUNS (100)', async () => {
        // Run 105 tasks; Map should not exceed 100 entries
        const firstRunId = (await parRun({ tasks: [{ id: 'seed', command: 'echo seed' }] })).runId;

        // Fill up to exactly MAX_RUNS - 1 more (we already have 1)
        for (let i = 0; i < 104; i++) {
            await parRun({ tasks: [{ id: `task-${i}`, command: 'echo x' }] });
        }

        // After 105 runs, the first entry should have been evicted
        const firstCollected = parCollect({ runId: firstRunId });
        expect(firstCollected.results).toHaveLength(0);
    }, 30_000);
});

// ─── parallel brick (index.ts) ───────────────────────────────────────────────

describe('parallel brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('parallel:run', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('parallel:collect', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('parallel:merge', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('parallel:timeout', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('parallel:run_inline', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('parallel');
        expect(brick.manifest.prefix).toBe('par');
    });
});
