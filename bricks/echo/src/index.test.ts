// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import brick, { echo } from './index.ts';

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

describe('echo brick (default export)', () => {
  it('declares the expected manifest', () => {
    expect(brick.manifest.name).toBe('echo');
    expect(brick.manifest.version).toBe('1.0.0');
    expect(brick.manifest.dependencies).toEqual([]);
    expect(brick.manifest.tools).toHaveLength(1);
    expect(brick.manifest.tools[0]?.name).toBe('echo_say');
  });

  it('registers the echo:say handler on the bus when started', async () => {
    const handlers = new Map<string, (data: unknown) => Promise<unknown> | unknown>();
    const bus = {
      on: vi.fn((event: string, handler: (data: unknown) => Promise<unknown> | unknown) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    };

    await brick.start({ bus });

    expect(bus.on).toHaveBeenCalledWith('echo:say', expect.any(Function));
    const handler = handlers.get('echo:say');
    expect(handler).toBeDefined();
    expect(await handler?.({ message: 'ping' })).toEqual({ message: 'ping' });
  });

  it('stop() is a no-op', async () => {
    await expect(Promise.resolve(brick.stop())).resolves.toBeUndefined();
  });
});
