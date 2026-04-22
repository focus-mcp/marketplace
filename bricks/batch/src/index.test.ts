// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { batMulti, batParallel, batPipeline, batSequential } from './operations.ts';

describe('batMulti', () => {
    it('runs multiple independent commands and collects results', async () => {
        const result = await batMulti({
            commands: ['echo hello', 'echo world'],
        });
        expect(result.results).toHaveLength(2);
        expect(result.results[0]?.exitCode).toBe(0);
        expect(result.results[0]?.stdout.trim()).toBe('hello');
        expect(result.results[1]?.exitCode).toBe(0);
        expect(result.results[1]?.stdout.trim()).toBe('world');
    });

    it('collects results for mixed success and failure', async () => {
        const result = await batMulti({
            commands: ['echo ok', 'false', 'echo after'],
        });
        expect(result.results).toHaveLength(3);
        expect(result.results[0]?.exitCode).toBe(0);
        expect(result.results[1]?.exitCode).not.toBe(0);
        expect(result.results[2]?.exitCode).toBe(0);
    });

    it('includes command, stdout, stderr, exitCode, duration in each result', async () => {
        const result = await batMulti({ commands: ['echo test'] });
        const r = result.results[0];
        expect(r).toHaveProperty('command', 'echo test');
        expect(r).toHaveProperty('stdout');
        expect(r).toHaveProperty('stderr');
        expect(r).toHaveProperty('exitCode');
        expect(r).toHaveProperty('duration');
        expect(typeof r?.duration).toBe('number');
    });
});

describe('batSequential', () => {
    it('runs commands in order', async () => {
        const result = await batSequential({
            commands: ['echo first', 'echo second', 'echo third'],
        });
        expect(result.results).toHaveLength(3);
        expect(result.results[0]?.stdout.trim()).toBe('first');
        expect(result.results[1]?.stdout.trim()).toBe('second');
        expect(result.results[2]?.stdout.trim()).toBe('third');
        expect(result.stoppedAt).toBeUndefined();
    });

    it('stops on first failure by default', async () => {
        const result = await batSequential({
            commands: ['echo before', 'false', 'echo after'],
        });
        expect(result.results).toHaveLength(2);
        expect(result.stoppedAt).toBe(1);
        expect(result.results[1]?.exitCode).not.toBe(0);
    });

    it('continues after failure when continueOnError is true', async () => {
        const result = await batSequential({
            commands: ['echo before', 'false', 'echo after'],
            continueOnError: true,
        });
        expect(result.results).toHaveLength(3);
        expect(result.stoppedAt).toBeUndefined();
        expect(result.results[2]?.stdout.trim()).toBe('after');
    });
});

describe('batParallel', () => {
    it('runs all commands and returns all results', async () => {
        const result = await batParallel({
            commands: ['echo a', 'echo b', 'echo c'],
        });
        expect(result.results).toHaveLength(3);
        expect(result.results.every((r) => r.exitCode === 0)).toBe(true);
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('runs faster than sequential for independent commands', async () => {
        const commands = ['sleep 0.01', 'sleep 0.01', 'sleep 0.01'];

        const tParallel = Date.now();
        await batParallel({ commands });
        const parallelMs = Date.now() - tParallel;

        const tSeq = Date.now();
        await batSequential({ commands });
        const seqMs = Date.now() - tSeq;

        // Parallel should be meaningfully faster than sequential
        expect(parallelMs).toBeLessThan(seqMs);
    });

    it('respects maxConcurrency — limits concurrent execution', async () => {
        // With maxConcurrency=1 it should behave like sequential
        const commands = ['echo x', 'echo y', 'echo z'];
        const result = await batParallel({ commands, maxConcurrency: 1 });
        expect(result.results).toHaveLength(3);
        // Results are in order (index-based)
        expect(result.results[0]?.stdout.trim()).toBe('x');
        expect(result.results[1]?.stdout.trim()).toBe('y');
        expect(result.results[2]?.stdout.trim()).toBe('z');
    });
});

describe('batPipeline', () => {
    it('pipes stdout through the command chain', async () => {
        const result = await batPipeline({
            commands: ['echo hello world', 'grep world'],
        });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('hello world');
    });

    it('returns non-zero exitCode when pipeline fails', async () => {
        const result = await batPipeline({
            commands: ['echo hello', 'grep nomatch_xyz'],
        });
        expect(result.exitCode).not.toBe(0);
    });

    it('includes duration in the output', async () => {
        const result = await batPipeline({ commands: ['echo test', 'true'] });
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
    });
});

describe('batch brick registration', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('batch:multi', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('batch:sequential', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('batch:parallel', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('batch:pipeline', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
