// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * collect — Harvest all recent benchmark sessions and aggregate into summary reports.
 *
 * Iterates over ~/.claude/projects/ subdirectories looking for JSONL files modified
 * in the last N hours (default 24) whose cwd matches a benchmark case directory.
 *
 * Writes:
 *   benchmarks/reports/sessions.json  — array of all parsed sessions
 *   benchmarks/reports/summary.json   — aggregated by task and by repo
 *
 * Usage: tsx benchmarks/scripts/collect.ts [--hours=48]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BENCHMARKS_DIR = resolve(__dirname, '..');
const REPORTS_DIR = join(BENCHMARKS_DIR, 'reports');
const PARSE_SCRIPT = join(__dirname, 'parse-session.ts');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

// Parse --hours flag
const hoursArg = process.argv.find((a) => a.startsWith('--hours='));
const HOURS = hoursArg ? parseInt(hoursArg.replace('--hours=', ''), 10) : 24;
const CUTOFF_MS = Date.now() - HOURS * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types (mirroring parse-session output)
// ---------------------------------------------------------------------------

interface TokenUsage {
    input: number;
    cache_creation: number;
    cache_read: number;
    output: number;
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
    violations: {
        used_native_tools: boolean;
        used_subagents: boolean;
        used_web: boolean;
        used_todowrite: boolean;
    };
    // enriched by collect
    task_id?: string;
    repo_id?: string;
    case_cwd?: string;
}

interface TaskSummary {
    runs: number;
    median_tokens_total: number;
    median_turns: number;
    violations_rate: number;
}

interface Summary {
    meta: {
        generated_at: string;
        session_count: number;
        hours_window: number;
    };
    by_task: Record<string, TaskSummary>;
    by_repo: Record<string, TaskSummary>;
    raw: SessionReport[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Match a benchmark case cwd: ends with cases/<task-id>/<repo-id>[/repo] */
function parseCasePath(cwd: string): { taskId: string; repoId: string } | null {
    const match = cwd.match(/cases[/\\]([^/\\]+)[/\\]([^/\\]+)([/\\]repo)?$/);
    if (!match) return null;
    return { taskId: match[1] ?? '', repoId: match[2] ?? '' };
}

function isBenchmarkCwd(cwd: string): boolean {
    return /cases[/\\][^/\\]+[/\\][^/\\]+([/\\]repo)?$/.test(cwd) && cwd.includes('benchmarks');
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? (sorted[mid] ?? 0)
        : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function totalTokens(t: TokenUsage): number {
    return t.input + t.cache_creation + t.cache_read + t.output;
}

function hasViolation(s: SessionReport): boolean {
    return (
        s.violations.used_native_tools ||
        s.violations.used_subagents ||
        s.violations.used_web ||
        s.violations.used_todowrite
    );
}

function summarizeGroup(sessions: SessionReport[]): TaskSummary {
    return {
        runs: sessions.length,
        median_tokens_total: median(sessions.map((s) => totalTokens(s.tokens))),
        median_turns: median(sessions.map((s) => s.turns)),
        violations_rate:
            sessions.length > 0
                ? Math.round((sessions.filter(hasViolation).length / sessions.length) * 100) / 100
                : 0,
    };
}

/** Extract cwd from a JSONL session file (first entry with cwd field) */
function extractCwdFromJsonl(filePath: string): string | null {
    try {
        const raw = readFileSync(filePath, 'utf8');
        const lines = raw.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
            try {
                const entry = JSON.parse(line) as Record<string, unknown>;
                if (typeof entry['cwd'] === 'string' && entry['cwd'].length > 0) {
                    return entry['cwd'];
                }
            } catch {
                // skip malformed line
            }
        }
    } catch {
        // unreadable file
    }
    return null;
}

function parseSessionFile(filePath: string): SessionReport {
    const output = execFileSync('tsx', [PARSE_SCRIPT, filePath], { encoding: 'utf8' });
    return JSON.parse(output) as SessionReport;
}

function collectProjectSessions(projectDir: string, projectPath: string): SessionReport[] {
    let files: string[];
    try {
        files = readdirSync(projectPath).filter((f) => f.endsWith('.jsonl'));
    } catch {
        return [];
    }

    const collected: SessionReport[] = [];

    for (const file of files) {
        const filePath = join(projectPath, file);

        let mtime: number;
        try {
            mtime = statSync(filePath).mtimeMs;
        } catch {
            continue;
        }
        if (mtime < CUTOFF_MS) continue;

        const cwd = extractCwdFromJsonl(filePath);
        if (!cwd || !isBenchmarkCwd(cwd)) continue;

        process.stdout.write(`Parsing: ${file} (project: ${projectDir})\n`);

        let parsed: SessionReport;
        try {
            parsed = parseSessionFile(filePath);
        } catch (err) {
            process.stderr.write(`  WARN: failed to parse ${file}: ${String(err)}\n`);
            continue;
        }

        const caseInfo = parseCasePath(cwd);
        if (caseInfo) {
            parsed.task_id = caseInfo.taskId;
            parsed.repo_id = caseInfo.repoId;
            parsed.case_cwd = cwd;
        }

        collected.push(parsed);
    }

    return collected;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

mkdirSync(REPORTS_DIR, { recursive: true });

if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    process.stderr.write(`Claude projects directory not found: ${CLAUDE_PROJECTS_DIR}\n`);
    process.exit(1);
}

process.stdout.write(`Scanning sessions modified in the last ${HOURS} hours...\n`);
process.stdout.write(`Looking in: ${CLAUDE_PROJECTS_DIR}\n`);

const allSessions: SessionReport[] = [];
const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR).filter((d) =>
    statSync(join(CLAUDE_PROJECTS_DIR, d)).isDirectory(),
);

for (const projectDir of projectDirs) {
    const sessions = collectProjectSessions(projectDir, join(CLAUDE_PROJECTS_DIR, projectDir));
    allSessions.push(...sessions);
}

process.stdout.write(`\nFound ${allSessions.length} benchmark session(s).\n`);

// Write sessions.json
const sessionsPath = join(REPORTS_DIR, 'sessions.json');
writeFileSync(sessionsPath, `${JSON.stringify(allSessions, null, 2)}\n`);
process.stdout.write(`Written: ${sessionsPath}\n`);

// Aggregate by task and by repo
const byTask: Record<string, SessionReport[]> = {};
const byRepo: Record<string, SessionReport[]> = {};

for (const s of allSessions) {
    if (s.task_id) {
        if (!byTask[s.task_id]) byTask[s.task_id] = [];
        byTask[s.task_id]?.push(s);
    }
    if (s.repo_id) {
        if (!byRepo[s.repo_id]) byRepo[s.repo_id] = [];
        byRepo[s.repo_id]?.push(s);
    }
}

const summary: Summary = {
    meta: {
        generated_at: new Date().toISOString(),
        session_count: allSessions.length,
        hours_window: HOURS,
    },
    by_task: Object.fromEntries(
        Object.entries(byTask).map(([task, sessions]) => [task, summarizeGroup(sessions)]),
    ),
    by_repo: Object.fromEntries(
        Object.entries(byRepo).map(([repo, sessions]) => [repo, summarizeGroup(sessions)]),
    ),
    raw: allSessions,
};

const summaryPath = join(REPORTS_DIR, 'summary.json');
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`Written: ${summaryPath}\n`);
process.stdout.write('\nDone.\n');
