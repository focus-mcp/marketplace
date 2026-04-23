// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * measure — Phase 1 static token-cost benchmark.
 *
 * For each task scenario in tasks.json, computes:
 *   - baseline_tokens: all 68 bricks loaded (no FocusMCP)
 *   - focus_tokens: only the required bricks for that task
 *   - savings_tokens / savings_pct: the delta
 *
 * Writes:
 *   - reports/summary.json   (machine-readable full results)
 *   - reports/<task-id>.md   (per-task markdown breakdown)
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countJsonTokens, tokenizerMode } from './token-count.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MARKETPLACE_ROOT = join(__dirname, '../..');
const BRICKS_DIR = join(MARKETPLACE_ROOT, 'bricks');
const BENCHMARKS_DIR = join(__dirname, '..');
const REPORTS_DIR = join(BENCHMARKS_DIR, 'reports');
const CATALOG_PATH = join(MARKETPLACE_ROOT, 'publish/catalog.json');
const TASKS_PATH = join(BENCHMARKS_DIR, 'tasks.json');

interface Tool {
    name: string;
    description: string;
    inputSchema: unknown;
}

interface BrickManifest {
    name: string;
    version?: string;
    prefix?: string;
    description?: string;
    tools: Tool[];
}

interface TaskScenario {
    id: string;
    title: string;
    description: string;
    required_bricks: string[];
}

interface BrickStat {
    name: string;
    tool_count: number;
    tokens: number;
}

interface TaskResult {
    id: string;
    title: string;
    baseline_tokens: number;
    focus_tokens: number;
    savings_tokens: number;
    savings_pct: number;
    required_bricks: string[];
    brick_breakdown: { name: string; tokens: number }[];
}

interface SummaryReport {
    meta: {
        generated_at: string;
        catalog_version: string;
        brick_count: number;
        tokenizer: string;
    };
    bricks: BrickStat[];
    tasks: TaskResult[];
}

function loadBricks(): Map<string, BrickStat> {
    const brickNames = readdirSync(BRICKS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    const stats = new Map<string, BrickStat>();

    for (const name of brickNames) {
        const manifestPath = join(BRICKS_DIR, name, 'mcp-brick.json');
        let manifest: BrickManifest;
        try {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as BrickManifest;
        } catch {
            console.warn(`  [warn] Could not read ${manifestPath}, skipping.`);
            continue;
        }

        const tools = manifest.tools ?? [];
        // Token cost = the tools array as it would appear in an MCP tools/list response
        const tokens = countJsonTokens(tools);

        stats.set(name, {
            name,
            tool_count: tools.length,
            tokens,
        });
    }

    return stats;
}

function loadTasks(): TaskScenario[] {
    return JSON.parse(readFileSync(TASKS_PATH, 'utf-8')) as TaskScenario[];
}

function getCatalogVersion(): string {
    try {
        const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')) as {
            version?: string;
            updated?: string;
        };
        return catalog.version ?? catalog.updated ?? 'unknown';
    } catch {
        return 'unknown';
    }
}

function formatNum(n: number): string {
    return n.toLocaleString('en-US');
}

function pct(p: number): string {
    return p.toFixed(1);
}

function writeTaskReport(task: TaskResult, allBricks: Map<string, BrickStat>): void {
    const lines: string[] = [
        `# Task: ${task.title}`,
        '',
        `**ID**: \`${task.id}\``,
        '',
        `## Token savings`,
        '',
        `| Metric | Value |`,
        `|---|---:|`,
        `| Without FocusMCP (all bricks) | ${formatNum(task.baseline_tokens)} tokens |`,
        `| With FocusMCP (task bricks only) | ${formatNum(task.focus_tokens)} tokens |`,
        `| Savings | **${formatNum(task.savings_tokens)} tokens (${pct(task.savings_pct)}%)** |`,
        '',
        `## Required bricks (${task.required_bricks.length} of ${allBricks.size})`,
        '',
        `| Brick | Tools | Tokens |`,
        `|---|---:|---:|`,
    ];

    for (const { name, tokens } of task.brick_breakdown) {
        const stat = allBricks.get(name);
        lines.push(`| \`${name}\` | ${stat?.tool_count ?? '?'} | ${formatNum(tokens)} |`);
    }

    lines.push('', `## All bricks (baseline)`, '', `| Brick | Tools | Tokens |`, `|---|---:|---:|`);

    const sorted = [...allBricks.values()].sort((a, b) => b.tokens - a.tokens);
    for (const { name, tool_count, tokens } of sorted) {
        const marker = task.required_bricks.includes(name) ? ' ✓' : '';
        lines.push(`| \`${name}\`${marker} | ${tool_count} | ${formatNum(tokens)} |`);
    }

    lines.push('', "_✓ = included in this task's focus set_", '');

    writeFileSync(join(REPORTS_DIR, `${task.id}.md`), lines.join('\n'), 'utf-8');
    console.log(`  Wrote reports/${task.id}.md`);
}

function run(): void {
    console.log('FocusMCP Benchmark — Phase 1 (static token cost)');
    console.log('='.repeat(50));

    mkdirSync(REPORTS_DIR, { recursive: true });

    console.log('\nLoading bricks...');
    const allBricks = loadBricks();
    console.log(`  Loaded ${allBricks.size} bricks`);

    console.log('\nLoading tasks...');
    const tasks = loadTasks();
    console.log(`  Loaded ${tasks.length} task scenarios`);

    const catalogVersion = getCatalogVersion();
    const baselineTokens = [...allBricks.values()].reduce((s, b) => s + b.tokens, 0);

    console.log(`\nBaseline (all bricks): ${formatNum(baselineTokens)} tokens`);
    console.log(`Tokenizer: ${tokenizerMode}`);

    const taskResults: TaskResult[] = [];

    console.log('\nComputing task savings...');
    for (const task of tasks) {
        const breakdown: { name: string; tokens: number }[] = [];
        let focusTokens = 0;

        for (const brickName of task.required_bricks) {
            const stat = allBricks.get(brickName);
            if (stat === undefined) {
                console.warn(
                    `  [warn] Brick '${brickName}' not found in task '${task.id}', skipping.`,
                );
                continue;
            }
            breakdown.push({ name: brickName, tokens: stat.tokens });
            focusTokens += stat.tokens;
        }

        const savingsTokens = baselineTokens - focusTokens;
        const savingsPct = (savingsTokens / baselineTokens) * 100;

        const result: TaskResult = {
            id: task.id,
            title: task.title,
            baseline_tokens: baselineTokens,
            focus_tokens: focusTokens,
            savings_tokens: savingsTokens,
            savings_pct: savingsPct,
            required_bricks: task.required_bricks,
            brick_breakdown: breakdown,
        };

        taskResults.push(result);
        console.log(
            `  ${task.id}: ${formatNum(baselineTokens)} → ${formatNum(focusTokens)} tokens (${pct(savingsPct)}% saved)`,
        );
        writeTaskReport(result, allBricks);
    }

    const brickStats: BrickStat[] = [...allBricks.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    const summary: SummaryReport = {
        meta: {
            generated_at: new Date().toISOString(),
            catalog_version: catalogVersion,
            brick_count: allBricks.size,
            tokenizer: tokenizerMode,
        },
        bricks: brickStats,
        tasks: taskResults,
    };

    const summaryPath = join(REPORTS_DIR, 'summary.json');
    writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');
    console.log(`\n  Wrote reports/summary.json`);

    console.log('\nDone.');
}

run();
