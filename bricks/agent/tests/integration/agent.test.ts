/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetAgents } from '../../src/operations.js';
import { check as checkAgtCapabilitiesHappy } from './scenarios/agt_capabilities/happy/invariants.js';
import { check as checkAgtListHappy } from './scenarios/agt_list/happy/invariants.js';
import { check as checkAgtRegisterHappy } from './scenarios/agt_register/happy/invariants.js';
import { check as checkAgtUnregisterHappy } from './scenarios/agt_unregister/happy/invariants.js';

beforeEach(() => {
    resetAgents();
});

afterEach(() => {
    resetAgents();
});

// ─── agt_register ─────────────────────────────────────────────────────────────

describe('agt_register integration', () => {
    it('happy: register({name, capabilities[3]}) → id truthy, name matches, caps=3', async () => {
        const output = await runTool(brick, 'register', {
            name: 'test-agent-alpha',
            capabilities: ['read', 'write', 'execute'],
        });
        for (const i of checkAgtRegisterHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── agt_unregister ───────────────────────────────────────────────────────────

describe('agt_unregister integration', () => {
    it('happy: register + unregister → removed=true, list empty', async () => {
        const registerOutput = await runTool(brick, 'register', {
            name: 'agent-to-remove',
            capabilities: ['read'],
        });
        const { id } = registerOutput as { id: string };
        const unregisterOutput = await runTool(brick, 'unregister', { id });
        const listOutput = await runTool(brick, 'list', {});
        for (const i of checkAgtUnregisterHappy(unregisterOutput, listOutput, id)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── agt_list ─────────────────────────────────────────────────────────────────

describe('agt_list integration', () => {
    it('happy: 3× register → list count=3, each entry has id/name/capabilities', async () => {
        for (const name of ['alpha', 'beta', 'gamma']) {
            await runTool(brick, 'register', { name, capabilities: ['read'] });
        }
        const output = await runTool(brick, 'list', {});
        for (const i of checkAgtListHappy(output, 3)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── agt_capabilities ─────────────────────────────────────────────────────────

describe('agt_capabilities integration', () => {
    it('happy: register cap=[read] + cap=[write], capabilities(read) → count=1 with read cap', async () => {
        await runTool(brick, 'register', { name: 'reader', capabilities: ['read'] });
        await runTool(brick, 'register', { name: 'writer', capabilities: ['write'] });
        const output = await runTool(brick, 'capabilities', { capability: 'read' });
        for (const i of checkAgtCapabilitiesHappy(output, 'read', 1)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
