/**
 * sweep-crossrepo.ts — Cross-repo spot-check: 10 bricks × 2 repos × 2 modes = 40 runs.
 *
 * Usage:
 *   pnpm tsx src/sweep-crossrepo.ts [--concurrency 3]
 *
 * Outputs:
 *   results/crossrepo/<brick>-<repo-tag>-<mode>-<ts>.json   raw run JSONs
 *   results/crossrepo-summary.json                           aggregate
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runOneMode, loadManifest, isoStamp, type RunResult } from './runner.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CROSSREPO_OUT = path.join(HARNESS_DIR, 'results', 'crossrepo');
const SUMMARY_OUT = path.join(HARNESS_DIR, 'results', 'crossrepo-summary.json');

const BRICK_TIMEOUT_MS = 10 * 60 * 1000; // 10 min per brick-pair

const TARGET_BRICKS = [
    'filelist',
    'contextpack',
    'filesearch',
    'impact',
    'refs',
    'rename',
    'symbol',
    'graphquery',
    'codeedit',
    'overview',
];

const REPOS: Array<{ tag: string; path: string }> = [
    { tag: 'django', path: path.join(os.homedir(), 'benchmarks', 'django') },
    { tag: 'kubernetes', path: path.join(os.homedir(), 'benchmarks', 'kubernetes') },
];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(): { concurrency: number } {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let concurrency = 3;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--concurrency') concurrency = parseInt(args[++i] ?? '3', 10);
    }
    return { concurrency };
}

// ---------------------------------------------------------------------------
// Semaphore
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
// Cross-repo summary row
// ---------------------------------------------------------------------------

interface CrossRepoRow {
    brick: string;
    repo: string;
    native_tokens: number;
    brick_tokens: number;
    delta_pct: number;
    native_turns: number;
    brick_turns: number;
    status: 'ok' | 'partial' | 'failed';
    error?: string;
}

// ---------------------------------------------------------------------------
// Run one brick+repo with retry and timeout
// ---------------------------------------------------------------------------

async function runPair(
    brick: string,
    repoTag: string,
    repoPath: string,
    outDir: string,
    attempt: number,
): Promise<{ native: RunResult | null; brick: RunResult | null; error?: string }> {
    const manifest = loadManifest(brick);

    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${BRICK_TIMEOUT_MS / 1000}s`)), BRICK_TIMEOUT_MS),
    );

    try {
        const result = await Promise.race([
            (async () => {
                // Inject repo path via env var
                process.env['FOCUS_TEST_REPO'] = repoPath;

                const stamp = isoStamp();
                const repoOutDir = path.join(outDir, '');

                // Native run
                const nativeResult = await runOneMode({
                    brick,
                    mode: 'native',
                    framing: 'minimal',
                    maxTurns: 20,
                    outDir: repoOutDir,
                    manifest,
                });

                // Rename output file to include repo tag
                renameOutput(repoOutDir, brick, 'native', stamp, repoTag);

                if (nativeResult.exit_reason === 'error' || nativeResult.exit_reason === 'missing_spec') {
                    return { native: nativeResult, brick: null, error: `native exit=${nativeResult.exit_reason}` };
                }

                const taskSpec = nativeResult.mini_task_spec!;

                // Brick run
                const brickResult = await runOneMode({
                    brick,
                    mode: 'brick',
                    framing: 'minimal',
                    maxTurns: 20,
                    outDir: repoOutDir,
                    taskSpec,
                    manifest,
                });

                renameOutput(repoOutDir, brick, 'brick', stamp, repoTag);

                return { native: nativeResult, brick: brickResult };
            })(),
            timeout,
        ]);

        // Reset env
        delete process.env['FOCUS_TEST_REPO'];
        return result;
    } catch (err) {
        delete process.env['FOCUS_TEST_REPO'];
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt < 2) {
            console.log(`  [retry] ${brick}@${repoTag} failed (${msg}), retrying...`);
            return runPair(brick, repoTag, repoPath, outDir, attempt + 1);
        }
        return { native: null, brick: null, error: msg };
    }
}

/**
 * Rename the most-recently-written run JSON to include the repo tag.
 * The runner writes files as `<brick>-<mode>-<ts>.json` — we want
 * `<brick>-<repoTag>-<mode>-<ts>.json` for easy identification.
 */
function renameOutput(outDir: string, brick: string, mode: string, _stamp: string, repoTag: string): void {
    try {
        const files = fs.readdirSync(outDir)
            .filter((f) => f.startsWith(`${brick}-${mode}-`) && f.endsWith('.json') && !f.includes(`-${repoTag}-`))
            .sort()
            .reverse(); // most recent first
        if (files.length > 0) {
            const oldName = files[0]!;
            // Insert repoTag after brick name: `<brick>-<mode>-<ts>` → `<brick>-<repoTag>-<mode>-<ts>`
            const newName = oldName.replace(`${brick}-${mode}-`, `${brick}-${repoTag}-${mode}-`);
            fs.renameSync(path.join(outDir, oldName), path.join(outDir, newName));
        }
    } catch {
        // Non-fatal — file naming is cosmetic
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const { concurrency: rawConcurrency } = parseArgs();

    // Verify repos exist
    for (const repo of REPOS) {
        if (!fs.existsSync(repo.path)) {
            console.error(`ERROR: repo not found: ${repo.path}`);
            process.exit(1);
        }
    }

    fs.mkdirSync(CROSSREPO_OUT, { recursive: true });

    const jobs: Array<{ brick: string; repo: typeof REPOS[0] }> = [];
    for (const brick of TARGET_BRICKS) {
        for (const repo of REPOS) {
            jobs.push({ brick, repo });
        }
    }

    const total = jobs.length;
    let concurrency = rawConcurrency;

    console.log(`\n╔══ Cross-repo Sweep ══════════════════════════════════════╗`);
    console.log(`║  Bricks: ${TARGET_BRICKS.length}  Repos: ${REPOS.length}  Jobs: ${total}  Concurrency: ${concurrency}`);
    console.log(`╚══════════════════════════════════════════════════════════╝\n`);

    const rows: CrossRepoRow[] = [];
    let completed = 0;
    const sweepStart = Date.now();
    const sem = makeSemaphore(concurrency);

    await Promise.all(
        jobs.map((job, idx) =>
            sem(async () => {
                const { brick, repo } = job;
                const n = idx + 1;
                process.stdout.write(`[${n}/${total}] ${brick}@${repo.tag} ... `);

                const { native, brick: brickResult, error } = await runPair(
                    brick,
                    repo.tag,
                    repo.path,
                    CROSSREPO_OUT,
                    1,
                );

                completed++;

                const nTok = native?.usage.total ?? 0;
                const bTok = brickResult?.usage.total ?? 0;
                const deltaPct = nTok > 0 ? ((bTok - nTok) / nTok) * 100 : NaN;
                const status: CrossRepoRow['status'] = error ? (native ? 'partial' : 'failed') : 'ok';

                const deltaStr = isNaN(deltaPct) ? '?' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`;
                console.log(`${deltaStr}  native=${nTok.toLocaleString()} brick=${bTok.toLocaleString()}${status !== 'ok' ? ` ⚠️ ${status}: ${error}` : ''}`);

                rows.push({
                    brick,
                    repo: repo.tag,
                    native_tokens: nTok,
                    brick_tokens: bTok,
                    delta_pct: isNaN(deltaPct) ? 0 : deltaPct,
                    native_turns: native?.turns ?? 0,
                    brick_turns: brickResult?.turns ?? 0,
                    status,
                    ...(error ? { error } : {}),
                });
            }),
        ),
    );

    const sweepDurationMs = Date.now() - sweepStart;
    const sweepDurationMin = (sweepDurationMs / 60000).toFixed(1);
    const totalTokens = rows.reduce((s, r) => s + r.native_tokens + r.brick_tokens, 0);

    fs.writeFileSync(SUMMARY_OUT, JSON.stringify(rows, null, 2));

    console.log(`\n╔══ Cross-repo sweep complete ════════════════════════════╗`);
    console.log(`║  Wall clock : ${sweepDurationMin} min`);
    console.log(`║  OK: ${rows.filter((r) => r.status === 'ok').length}  Partial: ${rows.filter((r) => r.status === 'partial').length}  Failed: ${rows.filter((r) => r.status === 'failed').length}`);
    console.log(`║  Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    console.log('Per-brick summary:');
    for (const brick of TARGET_BRICKS) {
        const brickRows = rows.filter((r) => r.brick === brick);
        const parts = brickRows.map((r) => {
            const d = r.delta_pct;
            return `${r.repo}=${d > 0 ? '+' : ''}${d.toFixed(1)}%`;
        });
        console.log(`  ${brick.padEnd(14)} ${parts.join('  ')}`);
    }

    console.log(`\nSummary JSON : ${SUMMARY_OUT}`);
}

main().catch((err: unknown) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
