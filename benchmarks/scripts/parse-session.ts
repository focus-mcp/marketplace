// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * parse-session — Extract token metrics and tool usage from a Claude Code JSONL session.
 *
 * CLI: tsx benchmarks/scripts/parse-session.ts <session-id-or-jsonl-path>
 *
 * Searches ~/.claude/projects/ subdirectories for matching session files when given a session ID.
 * Outputs structured JSON to stdout.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenUsage {
    input: number;
    cache_creation: number;
    cache_read: number;
    output: number;
}

interface Violations {
    used_native_tools: boolean;
    used_subagents: boolean;
    used_web: boolean;
    used_todowrite: boolean;
}

interface SessionReport {
    session_id: string;
    project: string;
    started_at: string;
    ended_at: string;
    turns: number;
    tokens: TokenUsage;
    tool_calls: {
        total: number;
        by_name: Record<string, number>;
    };
    violations: Violations;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NATIVE_TOOLS = new Set(['Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob', 'NotebookEdit']);
const SUBAGENT_TOOLS = new Set(['Agent', 'Task']);
const WEB_TOOLS = new Set(['WebSearch', 'WebFetch']);
const TODOWRITE_TOOLS = new Set(['TodoWrite']);

// ---------------------------------------------------------------------------
// JSONL parsing
// ---------------------------------------------------------------------------

interface JsonlEntry {
    type?: string;
    role?: string;
    message?: {
        role?: string;
        content?: unknown;
        usage?: {
            input_tokens?: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
            output_tokens?: number;
        };
    };
    usage?: {
        input_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
        output_tokens?: number;
    };
    toolUseBlock?: { name?: string };
    toolName?: string;
    timestamp?: string;
    sessionId?: string;
    cwd?: string;
    content?: Array<{ type?: string; name?: string }>;
}

function parseJsonl(filePath: string): JsonlEntry[] {
    const raw = readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const entries: JsonlEntry[] = [];
    for (const line of lines) {
        try {
            entries.push(JSON.parse(line) as JsonlEntry);
        } catch {
            // skip malformed lines
        }
    }
    return entries;
}

// ---------------------------------------------------------------------------
// Session resolution
// ---------------------------------------------------------------------------

function findSessionFile(sessionIdOrPath: string): { filePath: string; project: string } {
    if (existsSync(sessionIdOrPath)) {
        const parts = sessionIdOrPath.split('/');
        const project = parts.at(-2) ?? 'unknown';
        return { filePath: sessionIdOrPath, project };
    }

    const claudeDir = join(homedir(), '.claude', 'projects');
    if (!existsSync(claudeDir)) {
        throw new Error(`Claude projects directory not found: ${claudeDir}`);
    }

    const projectDirs = readdirSync(claudeDir).filter((d) =>
        statSync(join(claudeDir, d)).isDirectory(),
    );

    for (const projectDir of projectDirs) {
        const candidate = join(claudeDir, projectDir, `${sessionIdOrPath}.jsonl`);
        if (existsSync(candidate)) {
            return { filePath: candidate, project: projectDir };
        }
    }

    throw new Error(`Session not found: ${sessionIdOrPath}`);
}

// ---------------------------------------------------------------------------
// Tool name extraction (split to keep cyclomatic complexity low)
// ---------------------------------------------------------------------------

function extractToolNameFromContent(
    content: Array<{ type?: string; name?: string }>,
): string | null {
    for (const block of content) {
        if (block.type === 'tool_use' && block.name) return block.name;
    }
    return null;
}

function extractToolName(entry: JsonlEntry): string | null {
    if (entry.toolUseBlock?.name) return entry.toolUseBlock.name;
    if (entry.toolName) return entry.toolName;

    if (entry.message?.content && Array.isArray(entry.message.content)) {
        const name = extractToolNameFromContent(
            entry.message.content as Array<{ type?: string; name?: string }>,
        );
        if (name) return name;
    }

    if (entry.content && Array.isArray(entry.content)) {
        return extractToolNameFromContent(entry.content as Array<{ type?: string; name?: string }>);
    }

    return null;
}

// ---------------------------------------------------------------------------
// Token / turn accumulation (split to keep cyclomatic complexity low)
// ---------------------------------------------------------------------------

function accumulateEntry(
    entry: JsonlEntry,
    state: {
        tokens: TokenUsage;
        byName: Record<string, number>;
        turns: number;
        startedAt: string;
        endedAt: string;
        sessionId: string;
    },
): void {
    if (entry.timestamp) {
        if (!state.startedAt) state.startedAt = entry.timestamp;
        state.endedAt = entry.timestamp;
    }

    if (entry.sessionId && !state.sessionId) state.sessionId = entry.sessionId;

    if (
        entry.type === 'assistant' ||
        entry.role === 'assistant' ||
        entry.message?.role === 'assistant'
    ) {
        state.turns++;
    }

    const usage = entry.usage ?? entry.message?.usage;
    if (usage) {
        state.tokens.input += usage.input_tokens ?? 0;
        state.tokens.cache_creation += usage.cache_creation_input_tokens ?? 0;
        state.tokens.cache_read += usage.cache_read_input_tokens ?? 0;
        state.tokens.output += usage.output_tokens ?? 0;
    }

    const toolName = extractToolName(entry);
    if (toolName) {
        state.byName[toolName] = (state.byName[toolName] ?? 0) + 1;
    }
}

// ---------------------------------------------------------------------------
// Main parse
// ---------------------------------------------------------------------------

function parseSession(filePath: string, project: string): SessionReport {
    const entries = parseJsonl(filePath);

    const state = {
        tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 } as TokenUsage,
        byName: {} as Record<string, number>,
        turns: 0,
        startedAt: '',
        endedAt: '',
        sessionId: '',
    };

    for (const entry of entries) {
        accumulateEntry(entry, state);
    }

    const totalToolCalls = Object.values(state.byName).reduce((a, b) => a + b, 0);
    const usedTools = new Set(Object.keys(state.byName));

    const violations: Violations = {
        used_native_tools: [...NATIVE_TOOLS].some((t) => usedTools.has(t)),
        used_subagents: [...SUBAGENT_TOOLS].some((t) => usedTools.has(t)),
        used_web: [...WEB_TOOLS].some((t) => usedTools.has(t)),
        used_todowrite: [...TODOWRITE_TOOLS].some((t) => usedTools.has(t)),
    };

    const fallbackId = filePath.split('/').at(-1)?.replace('.jsonl', '') ?? 'unknown';

    return {
        session_id: state.sessionId || fallbackId,
        project,
        started_at: state.startedAt,
        ended_at: state.endedAt,
        turns: state.turns,
        tokens: state.tokens,
        tool_calls: {
            total: totalToolCalls,
            by_name: state.byName,
        },
        violations,
    };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const arg = process.argv[2];
if (!arg) {
    process.stderr.write(
        'Usage: tsx benchmarks/scripts/parse-session.ts <session-id-or-jsonl-path>\n',
    );
    process.exit(1);
}

try {
    const { filePath, project } = findSessionFile(arg);
    const report = parseSession(filePath, project);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
}
