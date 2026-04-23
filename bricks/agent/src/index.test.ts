// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agtCapabilities, agtList, agtRegister, agtUnregister, resetAgents } from './operations.ts';

beforeEach(() => {
    resetAgents();
});

afterEach(() => {
    resetAgents();
});

// ─── agtRegister ─────────────────────────────────────────────────────────────

describe('agtRegister', () => {
    it('registers an agent and returns id, name, capabilities', () => {
        const result = agtRegister({ name: 'TestAgent', capabilities: ['search', 'summarize'] });
        expect(result.id).toBeTruthy();
        expect(result.name).toBe('TestAgent');
        expect(result.capabilities).toEqual(['search', 'summarize']);
    });

    it('generates a unique id per registration', () => {
        const a = agtRegister({ name: 'A', capabilities: ['x'] });
        const b = agtRegister({ name: 'B', capabilities: ['y'] });
        expect(a.id).not.toBe(b.id);
    });

    it('stores optional metadata', () => {
        const result = agtRegister({
            name: 'Meta',
            capabilities: ['run'],
            metadata: { version: '1.0', env: 'prod' },
        });
        const listed = agtList({});
        const entry = listed.agents.find((a) => a.id === result.id);
        expect(entry?.metadata).toEqual({ version: '1.0', env: 'prod' });
    });

    it('defaults metadata to empty object when not provided', () => {
        const result = agtRegister({ name: 'NoMeta', capabilities: ['code'] });
        const listed = agtList({});
        const entry = listed.agents.find((a) => a.id === result.id);
        expect(entry?.metadata).toEqual({});
    });
});

// ─── agtUnregister ───────────────────────────────────────────────────────────

describe('agtUnregister', () => {
    it('removes a registered agent and returns removed: true', () => {
        const { id } = agtRegister({ name: 'ToRemove', capabilities: ['task'] });
        const result = agtUnregister({ id });
        expect(result.removed).toBe(true);
        expect(result.id).toBe(id);
        expect(agtList({}).count).toBe(0);
    });

    it('returns removed: false for unknown id', () => {
        const result = agtUnregister({ id: 'non-existent-uuid' });
        expect(result.removed).toBe(false);
        expect(result.id).toBe('non-existent-uuid');
    });
});

// ─── agtList ─────────────────────────────────────────────────────────────────

describe('agtList', () => {
    it('returns all agents when no capability filter', () => {
        agtRegister({ name: 'A', capabilities: ['alpha'] });
        agtRegister({ name: 'B', capabilities: ['beta'] });
        const result = agtList({});
        expect(result.count).toBe(2);
        expect(result.agents.length).toBe(2);
    });

    it('filters agents by capability', () => {
        agtRegister({ name: 'A', capabilities: ['search'] });
        agtRegister({ name: 'B', capabilities: ['code'] });
        agtRegister({ name: 'C', capabilities: ['search', 'code'] });
        const result = agtList({ capability: 'search' });
        expect(result.count).toBe(2);
        expect(result.agents.every((a) => a.capabilities.includes('search'))).toBe(true);
    });

    it('returns empty list when no agents registered', () => {
        const result = agtList({});
        expect(result.count).toBe(0);
        expect(result.agents).toEqual([]);
    });

    it('returns empty list when capability filter matches nothing', () => {
        agtRegister({ name: 'A', capabilities: ['alpha'] });
        const result = agtList({ capability: 'unknown-cap' });
        expect(result.count).toBe(0);
    });
});

// ─── agtCapabilities ─────────────────────────────────────────────────────────

describe('agtCapabilities', () => {
    it('returns agents matching the capability', () => {
        agtRegister({ name: 'X', capabilities: ['translate'] });
        agtRegister({ name: 'Y', capabilities: ['summarize'] });
        agtRegister({ name: 'Z', capabilities: ['translate', 'summarize'] });
        const result = agtCapabilities({ capability: 'translate' });
        expect(result.capability).toBe('translate');
        expect(result.count).toBe(2);
        expect(result.agents.every((a) => a.capabilities.includes('translate'))).toBe(true);
    });

    it('returns empty when no agent matches', () => {
        agtRegister({ name: 'A', capabilities: ['run'] });
        const result = agtCapabilities({ capability: 'fly' });
        expect(result.capability).toBe('fly');
        expect(result.count).toBe(0);
        expect(result.agents).toEqual([]);
    });
});

// ─── agent brick (index.ts) ──────────────────────────────────────────────────

describe('agent brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('agent:register', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('agent:unregister', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('agent:list', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('agent:capabilities', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes manifest with correct name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('agent');
        expect(brick.manifest.prefix).toBe('agt');
    });
});
