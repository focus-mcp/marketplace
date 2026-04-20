// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import brick, { echo, parseEchoInput } from './index.ts';

describe('echo (pure function)', () => {
    it('returns the message it receives', () => {
        expect(echo({ message: 'hello' })).toEqual({ message: 'hello' });
    });

    it('handles empty strings', () => {
        expect(echo({ message: '' })).toEqual({ message: '' });
    });

    it('preserves unicode and whitespace', () => {
        const weird = '  héllo 🎉 日本語\n\t  ';
        expect(echo({ message: weird })).toEqual({ message: weird });
    });
});

describe('parseEchoInput (runtime guard)', () => {
    it('accepts a valid object with a string message', () => {
        expect(parseEchoInput({ message: 'ok' })).toEqual({ message: 'ok' });
    });

    it('rejects null', () => {
        expect(() => parseEchoInput(null)).toThrow(TypeError);
    });

    it('rejects primitives', () => {
        expect(() => parseEchoInput('hello')).toThrow(TypeError);
        expect(() => parseEchoInput(42)).toThrow(TypeError);
    });

    it('rejects objects with a non-string message', () => {
        expect(() => parseEchoInput({ message: 123 })).toThrow(TypeError);
        expect(() => parseEchoInput({})).toThrow(TypeError);
    });
});

describe('echo brick (default export)', () => {
    it('declares the expected manifest (name, dependencies, tools)', () => {
        expect(brick.manifest.name).toBe('echo');
        expect(brick.manifest.dependencies).toEqual([]);
        expect(brick.manifest.tools).toHaveLength(1);
        expect(brick.manifest.tools[0]?.name).toBe('echo_say');
    });

    it('registers the echo:echo_say handler on the bus when started', async () => {
        const handlers = new Map<string, (data: unknown) => Promise<unknown> | unknown>();
        const bus = {
            handle: vi.fn(
                (event: string, handler: (data: unknown) => Promise<unknown> | unknown) => {
                    handlers.set(event, handler);
                    return () => handlers.delete(event);
                },
            ),
            on: vi.fn(),
        };

        await brick.start({ bus });

        expect(bus.handle).toHaveBeenCalledWith('echo:echo_say', expect.any(Function));
        const handler = handlers.get('echo:echo_say');
        expect(handler).toBeDefined();
        expect(await handler?.({ message: 'ping' })).toEqual({ message: 'ping' });
    });

    it('handler rejects invalid payloads with a TypeError', async () => {
        const handlers = new Map<string, (data: unknown) => Promise<unknown> | unknown>();
        const bus = {
            handle: (event: string, handler: (data: unknown) => Promise<unknown> | unknown) => {
                handlers.set(event, handler);
                return () => handlers.delete(event);
            },
            on: vi.fn(),
        };

        await brick.start({ bus });
        const handler = handlers.get('echo:echo_say');
        expect(() => handler?.({ not: 'an echo input' })).toThrow(TypeError);

        await brick.stop();
    });

    it('stop() invokes the unsubscribe returned by bus.handle', async () => {
        const unsubscribe = vi.fn();
        const bus = { handle: vi.fn(() => unsubscribe), on: vi.fn() };

        await brick.start({ bus });
        await brick.stop();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('stop() without start() is a safe no-op', async () => {
        await expect(Promise.resolve(brick.stop())).resolves.toBeUndefined();
    });
});
