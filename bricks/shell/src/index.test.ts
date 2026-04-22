// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBackgroundProcesses, shBackground, shCompress, shExec, shKill } from './operations.ts';

// ─── shExec ──────────────────────────────────────────────────────────────────

describe('shExec', () => {
    it('executes a simple echo command', async () => {
        const result = await shExec({ command: 'echo hello' });
        expect(result.stdout.trim()).toBe('hello');
        expect(result.stderr).toBe('');
        expect(result.exitCode).toBe(0);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('captures stderr', async () => {
        const result = await shExec({ command: 'echo error >&2' });
        expect(result.stderr.trim()).toBe('error');
        expect(result.exitCode).toBe(0);
    });

    it('returns non-zero exit code on failure', async () => {
        const result = await shExec({ command: 'false' });
        expect(result.exitCode).not.toBe(0);
    });

    it('returns zero exit code on success', async () => {
        const result = await shExec({ command: 'true' });
        expect(result.exitCode).toBe(0);
    });

    it('respects timeout and returns exit code 124', async () => {
        const result = await shExec({ command: 'sleep 10', timeout: 100 });
        expect(result.exitCode).toBe(124);
    });

    it('passes extra environment variables', async () => {
        const result = await shExec({ command: 'echo $MY_VAR', env: { MY_VAR: 'test_value' } });
        expect(result.stdout.trim()).toBe('test_value');
    });

    it('respects cwd option', async () => {
        const result = await shExec({ command: 'pwd', cwd: '/tmp' });
        expect(result.stdout.trim()).toBe('/tmp');
    });

    it('measures duration', async () => {
        const result = await shExec({ command: 'true' });
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });
});

// ─── shBackground + shKill ───────────────────────────────────────────────────

describe('shBackground', () => {
    afterEach(() => {
        // Clean up any remaining background processes
        for (const [id] of getBackgroundProcesses()) {
            shKill({ id });
        }
    });

    it('starts a background process and returns an id', () => {
        const result = shBackground({ command: 'sleep 30' });
        expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(result.command).toBe('sleep 30');
        expect(typeof result.pid).toBe('number');
    });

    it('registers process in the background map', () => {
        const result = shBackground({ command: 'sleep 30' });
        expect(getBackgroundProcesses().has(result.id)).toBe(true);
    });

    it('generates unique IDs for multiple processes', () => {
        const r1 = shBackground({ command: 'sleep 30' });
        const r2 = shBackground({ command: 'sleep 30' });
        expect(r1.id).not.toBe(r2.id);
    });
});

describe('shKill', () => {
    it('kills a background process by id', () => {
        const bg = shBackground({ command: 'sleep 30' });
        expect(getBackgroundProcesses().has(bg.id)).toBe(true);

        const result = shKill({ id: bg.id });
        expect(result.killed).toBe(true);
        expect(result.id).toBe(bg.id);
        expect(getBackgroundProcesses().has(bg.id)).toBe(false);
    });

    it('returns killed: false for unknown id', () => {
        const result = shKill({ id: 'non-existent-id' });
        expect(result.killed).toBe(false);
        expect(result.id).toBe('non-existent-id');
    });
});

// ─── shCompress ──────────────────────────────────────────────────────────────

describe('shCompress', () => {
    it('returns compressed output from a command', async () => {
        const result = await shCompress({ command: 'echo hello' });
        expect(result.output).toBe('hello');
        expect(result.lines).toBe(1);
        expect(result.truncated).toBe(false);
    });

    it('strips ANSI escape codes', async () => {
        // Output a string with ANSI color codes via printf
        const result = await shCompress({
            command: "printf '\\033[31mred text\\033[0m\\n'",
        });
        expect(result.output).toBe('red text');
        // ESC char (\x1b) should not be present after stripping
        expect(result.output.indexOf('\x1b')).toBe(-1);
    });

    it('truncates output to maxLines', async () => {
        // Generate 20 lines but limit to 5
        const result = await shCompress({
            command: 'for i in $(seq 1 20); do echo "line $i"; done',
            maxLines: 5,
        });
        expect(result.lines).toBe(5);
        expect(result.truncated).toBe(true);
    });

    it('does not truncate when output fits within maxLines', async () => {
        const result = await shCompress({
            command: 'echo one && echo two && echo three',
            maxLines: 100,
        });
        expect(result.lines).toBe(3);
        expect(result.truncated).toBe(false);
    });

    it('collapses consecutive blank lines', async () => {
        // Use printf to create multiple consecutive blank lines
        const result = await shCompress({
            command: "printf 'line1\\n\\n\\n\\nline2\\n'",
        });
        // After collapsing, there should be at most one blank line between content lines
        const consecutiveBlanks = result.output.match(/\n{3,}/);
        expect(consecutiveBlanks).toBeNull();
    });

    it('respects timeout', async () => {
        const result = await shCompress({ command: 'sleep 10', timeout: 100 });
        // Should complete (with timeout exit) rather than hanging
        expect(result).toBeDefined();
    });
});

// ─── brick registration ──────────────────────────────────────────────────────

describe('shell brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('shell:exec', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('shell:background', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('shell:kill', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('shell:compress', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('has correct manifest name', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('shell');
    });

    it('kills all background processes on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const bus = {
            handle: vi.fn(() => vi.fn()),
            on: vi.fn(),
        };

        await brick.start({ bus });

        // Start a background process
        const bg = shBackground({ command: 'sleep 30' });
        expect(getBackgroundProcesses().has(bg.id)).toBe(true);

        await brick.stop();

        // After stop, background processes should be cleared
        expect(getBackgroundProcesses().has(bg.id)).toBe(false);
    });
});
