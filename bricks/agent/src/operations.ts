// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentEntry {
    id: string;
    name: string;
    capabilities: string[];
    metadata: Record<string, string>;
    registeredAt: number;
}

export interface AgtRegisterInput {
    readonly name: string;
    readonly capabilities: readonly string[];
    readonly metadata?: Record<string, string>;
}

export interface AgtRegisterOutput {
    id: string;
    name: string;
    capabilities: string[];
}

export interface AgtUnregisterInput {
    readonly id: string;
}

export interface AgtUnregisterOutput {
    removed: boolean;
    id: string;
}

export interface AgtListInput {
    readonly capability?: string;
}

export interface AgtListOutput {
    agents: AgentEntry[];
    count: number;
}

export interface AgtCapabilitiesInput {
    readonly capability: string;
}

export interface AgtCapabilitiesOutput {
    capability: string;
    agents: AgentEntry[];
    count: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

const agents: Map<string, AgentEntry> = new Map();

export function resetAgents(): void {
    agents.clear();
}

// ─── agtRegister ─────────────────────────────────────────────────────────────

export function agtRegister(input: AgtRegisterInput): AgtRegisterOutput {
    const id = randomUUID();
    const capabilities = [...input.capabilities];
    const entry: AgentEntry = {
        id,
        name: input.name,
        capabilities,
        metadata: { ...(input.metadata ?? {}) },
        registeredAt: Date.now(),
    };
    agents.set(id, entry);
    return { id, name: entry.name, capabilities };
}

// ─── agtUnregister ───────────────────────────────────────────────────────────

export function agtUnregister(input: AgtUnregisterInput): AgtUnregisterOutput {
    const removed = agents.delete(input.id);
    return { removed, id: input.id };
}

// ─── agtList ─────────────────────────────────────────────────────────────────

export function agtList(input: AgtListInput): AgtListOutput {
    const all = [...agents.values()];
    const filtered =
        input.capability !== undefined
            ? all.filter((a) => a.capabilities.includes(input.capability as string))
            : all;
    return { agents: filtered, count: filtered.length };
}

// ─── agtCapabilities ─────────────────────────────────────────────────────────

export function agtCapabilities(input: AgtCapabilitiesInput): AgtCapabilitiesOutput {
    const matched = [...agents.values()].filter((a) => a.capabilities.includes(input.capability));
    return { capability: input.capability, agents: matched, count: matched.length };
}
