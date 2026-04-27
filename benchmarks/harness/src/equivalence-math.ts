// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

/**
 * Math Model — Break-even & Projections
 *
 * Based on static equivalence data from equivalence-report.md.
 *
 * Cost_brick(N) = M + D + N × (E + O_brick)
 * Cost_native(N) = N × O_native
 *
 * Break-even N* = (M + D) / (O_native − O_brick − E)
 *
 * Where:
 *   M  = manifest size in tokens (JSON.stringify(manifest).length / 4)
 *   D  = tool description size in tokens (description.length / 4)
 *   E  = envelope per-call constant (~50 tokens for JSON-RPC overhead)
 *   O_brick  = brick output tokens (from equivalence-report.md)
 *   O_native = native output tokens (from equivalence-report.md)
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETPLACE_ROOT = join(__dirname, '../../..');

// ─── Constants ────────────────────────────────────────────────────────────────

const E = 50; // JSON-RPC envelope overhead per call (tokens)

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquivalenceRow {
    brick: string;
    tool: string;
    description: string;
    native_tokens: number;
    brick_tokens: number;
    delta_pct: number;
}

interface McpBrickManifest {
    name: string;
    description?: string;
    tools?: Array<{
        name: string;
        description?: string;
    }>;
}

interface MathResult {
    brick: string;
    tool: string;
    description: string;
    native_tokens: number;
    brick_tokens: number;
    M: number;
    D: number;
    delta_per_call: number;
    break_even_N: number | null; // null = never wins (delta <= 0)
    savings_at_10: number;
    savings_at_100: number;
    savings_at_1000: number;
    category: 'always wins' | 'wins fast' | 'wins eventually' | 'never wins';
}

// ─── Parse equivalence-report.md ─────────────────────────────────────────────

function parseEquivalenceReport(content: string): EquivalenceRow[] {
    const rows: EquivalenceRow[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let doneWithMainTable = false;

    for (const line of lines) {
        // Detect start of the full results table (only the first one)
        if (!doneWithMainTable && line.includes('| Tool | Description | Native tokens | Brick tokens | Δ% |')) {
            inTable = true;
            continue;
        }
        // Skip separator line
        if (inTable && line.startsWith('|---|')) {
            continue;
        }
        // Stop at empty line or new section
        if (inTable && (!line.startsWith('|') || line.trim() === '')) {
            inTable = false;
            doneWithMainTable = true; // only parse the first table
            continue;
        }
        if (!inTable) continue;

        // Parse: | `brick.tool` | description | native | brick | delta |
        const match = line.match(
            /^\|\s*`([^.]+)\.([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*\*\*([+-][\d.]+)%\*\*\s*\|/,
        );
        if (!match) continue;

        const [, brick, tool, description, nativeRaw, brickRaw, deltaRaw] = match;
        rows.push({
            brick: brick!,
            tool: tool!,
            description: description!.trim(),
            native_tokens: parseInt((nativeRaw ?? '0').replace(/,/g, ''), 10),
            brick_tokens: parseInt((brickRaw ?? '0').replace(/,/g, ''), 10),
            delta_pct: parseFloat(deltaRaw ?? '0'),
        });
    }

    return rows;
}

// ─── Load manifest for a brick ────────────────────────────────────────────────

async function loadManifest(brickName: string): Promise<McpBrickManifest | null> {
    const path = join(MARKETPLACE_ROOT, 'bricks', brickName, 'mcp-brick.json');
    try {
        const content = await readFile(path, 'utf-8');
        return JSON.parse(content) as McpBrickManifest;
    } catch {
        return null;
    }
}

// ─── Token approximation ──────────────────────────────────────────────────────

function approxTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// ─── Compute math model for a single tool ────────────────────────────────────

function computeMath(
    row: EquivalenceRow,
    M: number,
    D: number,
): MathResult {
    const { native_tokens, brick_tokens } = row;

    // Δ marginal = O_native − O_brick − E
    const delta_per_call = native_tokens - brick_tokens - E;

    // Cost functions
    function costBrick(N: number): number {
        return M + D + N * (E + brick_tokens);
    }
    function costNative(N: number): number {
        return N * native_tokens;
    }
    function savings(N: number): number {
        return costNative(N) - costBrick(N);
    }

    // Break-even N* = (M + D) / delta_per_call
    let break_even_N: number | null;
    if (delta_per_call <= 0) {
        break_even_N = null; // never wins
    } else {
        break_even_N = (M + D) / delta_per_call;
    }

    // Category
    let category: MathResult['category'];
    if (delta_per_call <= 0) {
        category = 'never wins';
    } else if (break_even_N !== null && break_even_N < 1) {
        category = 'always wins';
    } else if (break_even_N !== null && break_even_N <= 10) {
        category = 'wins fast';
    } else if (break_even_N !== null && break_even_N <= 100) {
        category = 'wins eventually';
    } else {
        category = 'never wins';
    }

    return {
        brick: row.brick,
        tool: row.tool,
        description: row.description,
        native_tokens,
        brick_tokens,
        M,
        D,
        delta_per_call,
        break_even_N,
        savings_at_10: savings(10),
        savings_at_100: savings(100),
        savings_at_1000: savings(1000),
        category,
    };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtN(n: number): string {
    return n.toLocaleString('en-US');
}

function fmtBreakEven(n: number | null): string {
    if (n === null) return '∞';
    if (n < 0.01) return '**<0.01**';
    if (n < 1) return `**${n.toFixed(2)}**`;
    return n.toFixed(1);
}

function fmtSavings(n: number): string {
    if (n >= 0) return `+${fmtN(Math.round(n))}`;
    return fmtN(Math.round(n));
}

// ─── Global projections ───────────────────────────────────────────────────────

interface GlobalProjection {
    N: number;
    total_native: number;
    total_brick: number;
    savings: number;
    savings_pct: number;
}

function computeGlobalProjection(results: MathResult[], N: number): GlobalProjection {
    // Top-quartile: use "always wins" + "wins fast" tools (best performers)
    const topTools = results.filter(
        (r) => r.category === 'always wins' || r.category === 'wins fast',
    );

    // If fewer than needed, include "wins eventually" as well
    const pool = topTools.length >= 5 ? topTools : results.filter((r) => r.category !== 'never wins');

    // Pick top N/2 distinct bricks by delta_per_call, then simulate N calls split evenly
    const sorted = [...pool].sort((a, b) => b.delta_per_call - a.delta_per_call);
    // Take up to N tools for a "varied session"
    const sessionTools = sorted.slice(0, Math.min(N, sorted.length));
    const callsPerTool = Math.ceil(N / sessionTools.length);

    let total_native = 0;
    let total_brick = 0;

    for (const tool of sessionTools) {
        const calls = callsPerTool;
        total_native += calls * tool.native_tokens;
        total_brick += tool.M + tool.D + calls * (E + tool.brick_tokens);
    }

    const savings = total_native - total_brick;
    const savings_pct = total_native > 0 ? (savings / total_native) * 100 : 0;

    return { N, total_native, total_brick, savings, savings_pct };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    // 1. Read equivalence-report.md
    const reportPath = join(__dirname, '../../equivalence-report.md');
    const reportContent = await readFile(reportPath, 'utf-8');
    const rows = parseEquivalenceReport(reportContent);

    if (rows.length === 0) {
        throw new Error('No rows parsed from equivalence-report.md');
    }

    process.stderr.write(`Parsed ${rows.length} tools from equivalence-report.md\n`);

    // 2. Load manifests and compute math for each tool
    const results: MathResult[] = [];
    const manifestCache = new Map<string, McpBrickManifest | null>();

    for (const row of rows) {
        if (!manifestCache.has(row.brick)) {
            manifestCache.set(row.brick, await loadManifest(row.brick));
        }
        const manifest = manifestCache.get(row.brick) ?? null;

        let M = 0;
        let D = 0;

        if (manifest) {
            M = approxTokens(JSON.stringify(manifest));
            const toolDef = manifest.tools?.find(
                (t) => t.name === row.tool || `${manifest.prefix ?? manifest.name}_${t.name}` === row.tool,
            );
            // Also try matching by stripping brick prefix
            const toolDefFallback = manifest.tools?.find((t) => {
                const prefix = manifest.name ?? '';
                return row.tool === `${prefix}_${t.name}` || row.tool === t.name;
            });
            const resolvedTool = toolDef ?? toolDefFallback;
            D = approxTokens(resolvedTool?.description ?? '');
        }

        results.push(computeMath(row, M, D));
        process.stderr.write(
            `  ${row.brick}.${row.tool}: M=${M} D=${D} delta=${results[results.length - 1]!.delta_per_call} category=${results[results.length - 1]!.category}\n`,
        );
    }

    // 3. Sort by delta_per_call descending (best wins first)
    const sorted = [...results].sort((a, b) => b.delta_per_call - a.delta_per_call);

    // 4. Category stats
    const alwaysWins = results.filter((r) => r.category === 'always wins');
    const winsFast = results.filter((r) => r.category === 'wins fast');
    const winsEventually = results.filter((r) => r.category === 'wins eventually');
    const neverWins = results.filter((r) => r.category === 'never wins');

    // 5. Table rows
    const tableRows = sorted
        .map((r) => {
            const md_str = `${fmtN(r.M + r.D)}`;
            const delta_str = r.delta_per_call <= 0
                ? `**−${fmtN(Math.abs(r.delta_per_call))} (overhead)**`
                : `−${fmtN(r.delta_per_call)}`;
            return `| \`${r.brick}.${r.tool}\` | ${fmtN(r.M + r.D)} | ${delta_str} | ${fmtBreakEven(r.break_even_N)} | ${fmtSavings(r.savings_at_10)} | ${fmtSavings(r.savings_at_100)} | ${fmtSavings(r.savings_at_1000)} | ${r.category} |`;
        })
        .join('\n');

    // 6. Global projections at N=50
    const proj50 = computeGlobalProjection(results, 50);

    // 7. Top 5 always-wins (by delta/call)
    const top5 = sorted.filter((r) => r.category === 'always wins' || r.category === 'wins fast').slice(0, 5);
    const top5rows = top5
        .map((r) => `| \`${r.brick}.${r.tool}\` | −${fmtN(r.delta_per_call)} | ${r.description} |`)
        .join('\n');

    // 8. Bottom 5 never-wins
    const bottom5 = [...results]
        .filter((r) => r.category === 'never wins')
        .sort((a, b) => a.delta_per_call - b.delta_per_call)
        .slice(0, 5);
    const bottom5rows = bottom5
        .map((r) => {
            const reason =
                r.delta_per_call <= 0
                    ? `Overhead: brick adds ${fmtN(Math.abs(r.delta_per_call))} tokens/call`
                    : `Break-even at N=${r.break_even_N?.toFixed(0)} (> 100)`;
            return `| \`${r.brick}.${r.tool}\` | ${reason} |`;
        })
        .join('\n');

    // 9. "Tools à éviter" table
    const avoirRows = [...results]
        .filter((r) => r.category === 'never wins' || r.category === 'wins eventually')
        .sort((a, b) => a.delta_per_call - b.delta_per_call)
        .map((r) => {
            const reason =
                r.delta_per_call <= 0
                    ? 'No token reduction vs native (overhead)'
                    : `Amortizes only after ${r.break_even_N?.toFixed(0)} calls`;
            return `| \`${r.brick}.${r.tool}\` | ${reason} |`;
        })
        .join('\n');

    // 10. "Tools à privilégier" table (always wins sorted by delta)
    const privilRows = sorted
        .filter((r) => r.category === 'always wins')
        .slice(0, 10)
        .map((r) => `| \`${r.brick}.${r.tool}\` | −${fmtN(r.delta_per_call)} | ${r.description} |`)
        .join('\n');

    // 11. Build report
    const report = `# Equivalence Math Model — Break-even Analysis

Source data: \`equivalence-report.md\` (static equivalence, ${rows.length} tools).
Model: \`Cost_brick(N) = M + D + N × (E + O_brick)\`; \`Cost_native(N) = N × O_native\`.
Envelope constant: E = ${E} tokens (JSON-RPC overhead per call).

## Break-even table

| Tool | M+D | Δ marginal/call | Break-even N* | Saved @ 10 calls | @ 100 | @ 1000 | Category |
|---|---:|---:|---:|---:|---:|---:|---|
${tableRows}

> **M** = manifest size in tokens. **D** = tool description tokens. **Δ marginal** = tokens saved per additional call (positive = saves). **Break-even N*** = number of calls to amortize fixed cost.

## Categories summary

- **Always wins** (N* < 1) : ${alwaysWins.length} tools — profit from the very first call
- **Wins fast** (N* ≤ 10) : ${winsFast.length} tools — profitable after a handful of calls
- **Wins eventually** (N* ≤ 100) : ${winsEventually.length} tools — profitable for regular use
- **Never wins** (Δ ≤ 0 or N* > 100) : ${neverWins.length} tools — pure overhead (compute, format, echo)

## Projections globales

Sur une session typique de **${proj50.N} appels brick variés** (mix top-quartile bricks) :
- Total tokens native : ~${fmtN(proj50.total_native)}
- Total tokens brick : ~${fmtN(proj50.total_brick)}
- Économie : ${fmtN(proj50.savings)} tokens (${proj50.savings_pct.toFixed(1)}%)

## Tools à éviter en single-shot

(catégorie "never wins" ou "wins eventually" — overhead ou amortissement tardif)

| Tool | Reason |
|---|---|
${avoirRows}

## Tools à privilégier dès N=1

(top "always wins" — profit immédiat, Δ/call le plus élevé)

| Tool | Δ/call | Use case |
|---|---:|---|
${privilRows}

## Top 5 — always wins

| Tool | Δ/call | Use case |
|---|---:|---|
${top5rows}

## Bottom 5 — never wins

| Tool | Reason |
|---|---|
${bottom5rows}
`;

    process.stdout.write(report);
}

main().catch((err: unknown) => {
    process.stderr.write(`Fatal: ${(err as Error).message}\n${(err as Error).stack ?? ''}\n`);
    process.exitCode = 1;
});
