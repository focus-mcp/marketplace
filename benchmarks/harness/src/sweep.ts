/**
 * sweep.ts — Run the full 62-brick benchmark sweep.
 *
 * Usage:
 *   pnpm tsx src/sweep.ts [--concurrency 3] [--out-dir ./results] [--bricks a,b,c]
 *
 * Outputs:
 *   harness/results/<brick>-<mode>-<ts>.json   raw run JSONs
 *   benchmarks/bricks/<brick>.md               per-brick fiche
 *   harness/results/summary.json               aggregate
 *   harness/sweep-log-<ts>.md                  sweep log
 */
import fs from 'node:fs';
import path from 'node:path';
import { runOneMode, loadManifest, isoStamp, type RunResult, type BrickManifest } from './runner.js';
import { generateFiche } from './generate-fiche.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EXCLUDE = new Set(['aiteam', 'codebase', 'codemod', 'devtools', 'filesystem', 'knowledgebase']);
const BRICK_TIMEOUT_MS_BASE = 10 * 60 * 1000; // 10 min per brick at maxTurns=20 (covers both runs)
const PARTIAL_FICHE_BANNER = '⚠️ Run failed — partial data';

const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MARKETPLACE_DIR = path.resolve(HARNESS_DIR, '../..');
const BRICKS_DIR = path.join(MARKETPLACE_DIR, 'bricks');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(): { concurrency: number; outDir: string; bricks: string[] | null; maxTurns: number } {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let concurrency = 3;
    let outDir = path.join(HARNESS_DIR, 'results');
    let bricks: string[] | null = null;
    let maxTurns = 20;
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--concurrency': concurrency = parseInt(args[++i] ?? '3', 10); break;
            case '--out-dir':     outDir = args[++i] ?? outDir; break;
            case '--bricks':      bricks = (args[++i] ?? '').split(',').map((b) => b.trim()).filter(Boolean); break;
            case '--max-turns':   maxTurns = parseInt(args[++i] ?? '20', 10); break;
        }
    }
    return { concurrency, outDir, bricks, maxTurns };
}

// ---------------------------------------------------------------------------
// Brick list
// ---------------------------------------------------------------------------

function getBrickList(filter: string[] | null): string[] {
    const all = fs.readdirSync(BRICKS_DIR).filter((b) => {
        if (EXCLUDE.has(b)) return false;
        const mf = path.join(BRICKS_DIR, b, 'mcp-brick.json');
        if (!fs.existsSync(mf)) return false;
        const d = JSON.parse(fs.readFileSync(mf, 'utf-8')) as { tools?: unknown[] };
        return (d.tools ?? []).length > 0;
    }).sort();
    if (filter) return all.filter((b) => filter.includes(b));
    return all;
}

// ---------------------------------------------------------------------------
// Semaphore (p-limit equivalent without external dep)
// ---------------------------------------------------------------------------

function makeSemaphore(n: number) {
    let active = 0;
    const queue: Array<() => void> = [];
    return async function acquire<T>(fn: () => Promise<T>): Promise<T> {
        await new Promise<void>((resolve) => {
            if (active < n) { active++; resolve(); }
            else queue.push(() => { active++; resolve(); });
        });
        try {
            return await fn();
        } finally {
            active--;
            if (queue.length > 0) queue.shift()!();
        }
    };
}

// ---------------------------------------------------------------------------
// Per-brick result summary
// ---------------------------------------------------------------------------

interface BrickSummary {
    brick: string;
    status: 'ok' | 'partial' | 'failed';
    native_tokens: number;
    brick_tokens: number;
    delta_pct: number;
    native_turns: number;
    brick_turns: number;
    duration_native_s: number;
    duration_brick_s: number;
    duration_ratio: number;
    coverage: string;
    coverage_num: number;
    coverage_den: number;
    issues: string[];
    error?: string;
}

// ---------------------------------------------------------------------------
// Run one brick with retry + timeout
// ---------------------------------------------------------------------------

async function runBrickWithRetry(
    brick: string,
    outDir: string,
    attempt: number,
    maxTurns: number,
): Promise<{ native: RunResult | null; brick: RunResult | null; error?: string }> {
    const manifest = loadManifest(brick);

    // Scale timeout proportionally with maxTurns (base=10 min for 20 turns)
    const timeoutMs = Math.round(BRICK_TIMEOUT_MS_BASE * (maxTurns / 20));
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs / 1000}s`)), timeoutMs),
    );

    try {
        const result = await Promise.race([
            (async () => {
                // Native run
                const nativeResult = await runOneMode({
                    brick, mode: 'native', framing: 'minimal', maxTurns, outDir, manifest,
                });

                if (nativeResult.exit_reason === 'error' || nativeResult.exit_reason === 'missing_spec') {
                    return { native: nativeResult, brick: null, error: `native exit=${nativeResult.exit_reason}` };
                }

                const taskSpec = nativeResult.mini_task_spec!;

                // Brick run
                const brickResult = await runOneMode({
                    brick, mode: 'brick', framing: 'minimal', maxTurns, outDir, taskSpec, manifest,
                });

                return { native: nativeResult, brick: brickResult };
            })(),
            timeout,
        ]);
        return result;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt < 2) {
            console.log(`  [retry] ${brick} failed (${msg}), retrying...`);
            return runBrickWithRetry(brick, outDir, attempt + 1, maxTurns);
        }
        return { native: null, brick: null, error: msg };
    }
}

// ---------------------------------------------------------------------------
// Generate partial fiche for failures
// ---------------------------------------------------------------------------

function writePartialFiche(brick: string, error: string, native: RunResult | null): void {
    const fichesDir = path.join(MARKETPLACE_DIR, 'benchmarks', 'bricks');
    fs.mkdirSync(fichesDir, { recursive: true });
    const fichePath = path.join(fichesDir, `${brick}.md`);
    const manifest = (() => {
        try { return loadManifest(brick); } catch { return null; }
    })();

    const header = manifest
        ? `**Domaine** : ${manifest.description}\n**Prefix** : \`${manifest.prefix}\`\n**Tools** : ${manifest.tools.length}`
        : '_Manifest unavailable_';

    let content = `# Fiche brick — ${brick}\n\n${PARTIAL_FICHE_BANNER}\n\n${header}\n\n`;
    content += `**Error**: ${error}\n\n`;
    if (native) {
        content += `## Native run (partial)\n- tokens: ${native.usage.total}\n- turns: ${native.turns}\n- exit: ${native.exit_reason}\n`;
        if (native.result_block) content += `\n${native.result_block}\n`;
    }
    fs.writeFileSync(fichePath, content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const { concurrency, outDir, bricks: brickFilter, maxTurns } = parseArgs();
    const bricks = getBrickList(brickFilter);
    const total = bricks.length;
    const sweepStamp = isoStamp();

    fs.mkdirSync(outDir, { recursive: true });

    console.log(`\n╔══ FocusMCP Benchmark Sweep ══════════════════════════════╗`);
    console.log(`║  Bricks: ${total}  Concurrency: ${concurrency}  Framing: minimal  MaxTurns: ${maxTurns}`);
    console.log(`╚══════════════════════════════════════════════════════════╝\n`);

    const summaries: BrickSummary[] = [];
    const logLines: string[] = [
        `# Sweep log — ${sweepStamp}`,
        ``,
        `Bricks: ${total}  Concurrency: ${concurrency}`,
        ``,
        `## Per-brick`,
        ``,
        `| # | Brick | Status | Native tok | Brick tok | Δ% | Coverage | Duration ratio |`,
        `|---|-------|--------|----------:|----------:|---:|----------|----------------|`,
    ];

    let completed = 0;
    const sweepStart = Date.now();
    const sem = makeSemaphore(concurrency);

    await Promise.all(
        bricks.map((brick, idx) =>
            sem(async () => {
                const n = idx + 1;
                process.stdout.write(`[${n}/${total}] ${brick} ... `);

                const { native, brick: brickResult, error } = await runBrickWithRetry(brick, outDir, 1, maxTurns);

                completed++;

                // Determine coverage
                let coverageStr = '?';
                let covNum = 0;
                let covDen = 0;
                try {
                    const manifest = loadManifest(brick);
                    covDen = manifest.tools.length;
                    if (brickResult) {
                        const prefix = `mcp__focus__${manifest.prefix}_`;
                        covNum = brickResult.tools_used.filter((t) => t.startsWith(prefix)).length;
                        // Count unique tool names
                        const uniqueNames = new Set(
                            brickResult.tools_used
                                .filter((t) => t.startsWith(prefix))
                                .map((t) => t.slice(prefix.length)),
                        );
                        covNum = uniqueNames.size;
                        coverageStr = `${covNum}/${covDen}`;
                    }
                } catch { /* ignore */ }

                const nTok = native?.usage.total ?? 0;
                const bTok = brickResult?.usage.total ?? 0;
                const deltaPct = nTok > 0 ? ((bTok - nTok) / nTok) * 100 : NaN;
                const nativeS = (native?.duration_ms ?? 0) / 1000;
                const brickS = (brickResult?.duration_ms ?? 0) / 1000;
                const durRatio = nativeS > 0 ? brickS / nativeS : NaN;

                const issues: string[] = [];
                if (error) issues.push(`run error: ${error}`);
                if (brickResult?.focus_stderr) issues.push('focus_stderr non-empty');
                if (brickResult && brickResult.turns > 15) issues.push(`brick turns=${brickResult.turns}`);
                if (!isNaN(deltaPct) && deltaPct > 0) issues.push(`brick net-worse: +${deltaPct.toFixed(1)}%`);
                if (covNum < covDen * 0.5 && covDen > 0 && brickResult) issues.push(`low coverage ${coverageStr}`);

                const status: BrickSummary['status'] = error ? (native ? 'partial' : 'failed') : 'ok';

                // Generate fiche
                if (native && brickResult) {
                    try {
                        generateFiche(native, brickResult);
                    } catch (e) {
                        issues.push(`fiche error: ${e instanceof Error ? e.message : String(e)}`);
                    }
                } else {
                    writePartialFiche(brick, error ?? 'unknown', native);
                }

                const summary: BrickSummary = {
                    brick,
                    status,
                    native_tokens: nTok,
                    brick_tokens: bTok,
                    delta_pct: isNaN(deltaPct) ? 0 : deltaPct,
                    native_turns: native?.turns ?? 0,
                    brick_turns: brickResult?.turns ?? 0,
                    duration_native_s: nativeS,
                    duration_brick_s: brickS,
                    duration_ratio: isNaN(durRatio) ? 0 : durRatio,
                    coverage: coverageStr,
                    coverage_num: covNum,
                    coverage_den: covDen,
                    issues,
                };
                summaries.push(summary);

                const deltaStr = isNaN(deltaPct) ? '?' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`;
                const durRatioStr = isNaN(durRatio) ? '?' : `${durRatio.toFixed(2)}x`;
                const line = `[${n}/${total}] ${brick} native=${nTok.toLocaleString()} brick=${bTok.toLocaleString()} delta=${deltaStr} duration_ratio=${durRatioStr} coverage=${coverageStr}${status !== 'ok' ? ` ⚠️ ${status}` : ''}`;
                console.log(line);

                logLines.push(`| ${n} | ${brick} | ${status} | ${nTok.toLocaleString()} | ${bTok.toLocaleString()} | ${deltaStr} | ${coverageStr} | ${durRatioStr} |`);

                // Ping after first 5 completions
                if (completed === 5) {
                    console.log('\n--- Sanity check: first 5 complete ---');
                }
            }),
        ),
    );

    const sweepDurationMs = Date.now() - sweepStart;
    const sweepDurationMin = (sweepDurationMs / 60000).toFixed(1);

    // Sort summaries by delta_pct ascending (best savings first)
    const sorted = [...summaries].sort((a, b) => a.delta_pct - b.delta_pct);

    const okCount = summaries.filter((s) => s.status === 'ok').length;
    const partialCount = summaries.filter((s) => s.status === 'partial').length;
    const failedCount = summaries.filter((s) => s.status === 'failed').length;
    const totalNativeTok = summaries.reduce((s, r) => s + r.native_tokens, 0);
    const totalBrickTok = summaries.reduce((s, r) => s + r.brick_tokens, 0);
    const grandTotal = totalNativeTok + totalBrickTok;

    // Write summary.json — merge with existing entries (replace only the bricks we ran)
    const summaryPath = path.join(outDir, 'summary.json');
    let merged: BrickSummary[] = summaries;
    if (brickFilter !== null && fs.existsSync(summaryPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as BrickSummary[];
            const newKeys = new Set(summaries.map((s) => s.brick));
            merged = [...existing.filter((s) => !newKeys.has(s.brick)), ...summaries];
            merged.sort((a, b) => a.brick.localeCompare(b.brick));
        } catch { /* fallback: overwrite */ }
    }
    fs.writeFileSync(summaryPath, JSON.stringify(merged, null, 2));

    // Build sweep log
    logLines.push('');
    logLines.push('## Summary');
    logLines.push('');
    logLines.push(`- Wall clock: ${sweepDurationMin} min`);
    logLines.push(`- OK: ${okCount}  Partial: ${partialCount}  Failed: ${failedCount}`);
    logLines.push(`- Total tokens (native+brick): ${grandTotal.toLocaleString()}`);
    logLines.push('');
    logLines.push('### Top 10 best delta% (most savings)');
    logLines.push('');
    sorted.slice(0, 10).forEach((s, i) =>
        logLines.push(`${i + 1}. **${s.brick}** — ${s.delta_pct.toFixed(1)}%  (native=${s.native_tokens.toLocaleString()}, brick=${s.brick_tokens.toLocaleString()})`));
    logLines.push('');
    logLines.push('### Top 10 worst delta% (least savings / net-worse)');
    logLines.push('');
    [...sorted].reverse().slice(0, 10).forEach((s, i) =>
        logLines.push(`${i + 1}. **${s.brick}** — ${s.delta_pct.toFixed(1)}%`));
    logLines.push('');
    logLines.push('### Top 10 slowest duration_ratio (brick_s / native_s)');
    logLines.push('');
    [...summaries]
        .filter((s) => s.duration_ratio > 0)
        .sort((a, b) => b.duration_ratio - a.duration_ratio)
        .slice(0, 10)
        .forEach((s, i) =>
            logLines.push(`${i + 1}. **${s.brick}** — ${s.duration_ratio.toFixed(2)}x  (native=${s.duration_native_s.toFixed(1)}s, brick=${s.duration_brick_s.toFixed(1)}s)`));
    logLines.push('');
    logLines.push('### Low coverage (< 50% tools used)');
    logLines.push('');
    summaries
        .filter((s) => s.coverage_den > 0 && s.coverage_num / s.coverage_den < 0.5 && s.status === 'ok')
        .sort((a, b) => a.coverage_num / a.coverage_den - b.coverage_num / b.coverage_den)
        .forEach((s) => logLines.push(`- **${s.brick}** — ${s.coverage} tools called`));

    const logPath = path.join(HARNESS_DIR, `sweep-log-${sweepStamp}.md`);
    fs.writeFileSync(logPath, logLines.join('\n') + '\n');

    // Print final report
    console.log('\n╔══ Sweep complete ══════════════════════════════════════════╗');
    console.log(`║  Wall clock : ${sweepDurationMin} min`);
    console.log(`║  OK: ${okCount}  Partial: ${partialCount}  Failed: ${failedCount}`);
    console.log(`║  Total tokens consumed: ${grandTotal.toLocaleString()}`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log('Top 10 best delta% (most token savings):');
    sorted.slice(0, 10).forEach((s, i) =>
        console.log(`  ${i + 1}. ${s.brick}: ${s.delta_pct.toFixed(1)}%`));

    console.log('\nTop 10 worst delta% (least savings):');
    [...sorted].reverse().slice(0, 10).forEach((s, i) =>
        console.log(`  ${i + 1}. ${s.brick}: ${s.delta_pct.toFixed(1)}%`));

    console.log('\nTop 10 slowest duration_ratio:');
    [...summaries]
        .filter((s) => s.duration_ratio > 0)
        .sort((a, b) => b.duration_ratio - a.duration_ratio)
        .slice(0, 10)
        .forEach((s, i) =>
            console.log(`  ${i + 1}. ${s.brick}: ${s.duration_ratio.toFixed(2)}x`));

    console.log('\nLow coverage (< 50%):');
    const lowCov = summaries.filter(
        (s) => s.coverage_den > 0 && s.coverage_num / s.coverage_den < 0.5 && s.status === 'ok',
    );
    lowCov.length === 0
        ? console.log('  (none)')
        : lowCov.forEach((s) => console.log(`  ${s.brick}: ${s.coverage}`));

    console.log(`\nSummary JSON : ${summaryPath}`);
    console.log(`Sweep log    : ${logPath}`);

    if (failedCount > 0) {
        console.log('\nFailed bricks:');
        summaries.filter((s) => s.status === 'failed').forEach((s) =>
            console.log(`  ${s.brick}: ${s.issues.join(', ')}`));
    }
}

main().catch((err: unknown) => {
    console.error('Fatal sweep error:', err);
    process.exit(1);
});
