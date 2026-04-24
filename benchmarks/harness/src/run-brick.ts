/**
 * run-brick.ts — Orchestrator: runs native then brick for one brick, then generates the fiche.
 *
 * Usage:
 *   pnpm tsx src/run-brick.ts --brick filelist [--framing minimal|claude-code] [--out-dir ./results] [--skip-fiche]
 */
import { runOneMode, loadManifest, type Framing } from './runner.js';
import { generateFiche } from './generate-fiche.js';

function parseArgs(): {
    brick: string;
    framing: Framing;
    outDir: string;
    skipFiche: boolean;
    maxTurns: number;
} {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let brick = '';
    let framing: Framing = 'minimal';
    let outDir = './results';
    let skipFiche = false;
    let maxTurns = 20;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--brick':      brick = args[++i] ?? ''; break;
            case '--framing':    framing = (args[++i] ?? 'minimal') as Framing; break;
            case '--out-dir':    outDir = args[++i] ?? './results'; break;
            case '--max-turns':  maxTurns = parseInt(args[++i] ?? '20', 10); break;
            case '--skip-fiche': skipFiche = true; break;
        }
    }

    if (!brick) { console.error('ERROR: --brick <name> is required'); process.exit(1); }
    if (framing !== 'minimal' && framing !== 'claude-code') {
        console.error('ERROR: --framing must be minimal or claude-code'); process.exit(1);
    }
    return { brick, framing, outDir, skipFiche, maxTurns };
}

async function main() {
    const { brick, framing, outDir, skipFiche, maxTurns } = parseArgs();
    const manifest = loadManifest(brick);

    console.log(`\n═══ Brick benchmark: ${brick} (framing=${framing}) ═══\n`);

    // ── 1. Native run ──────────────────────────────────────────────────────
    console.log('► Step 1/3 — native run (design + solve)');
    const nativeResult = await runOneMode({
        brick, mode: 'native', framing, maxTurns, outDir, manifest,
    });

    if (nativeResult.exit_reason === 'error') {
        console.error('\nNative run failed — aborting. Fix the error and retry.');
        process.exit(1);
    }
    if (nativeResult.exit_reason === 'missing_spec') {
        console.error('\nNative run produced no ## Mini-task spec — aborting brick run.');
        console.error('The prompt or agent output needs investigation.');
        process.exit(1);
    }

    const taskSpec = nativeResult.mini_task_spec!;
    console.log(`  task spec parsed (${taskSpec.length} chars)\n`);

    // ── 2. Brick run ───────────────────────────────────────────────────────
    console.log('► Step 2/3 — brick run (solve given)');
    const brickResult = await runOneMode({
        brick, mode: 'brick', framing, maxTurns, outDir, taskSpec, manifest,
    });

    // ── 3. Fiche ───────────────────────────────────────────────────────────
    let fichePath: string | null = null;
    if (!skipFiche) {
        console.log('\n► Step 3/3 — generating fiche');
        fichePath = generateFiche(nativeResult, brickResult);
        console.log(`  → ${fichePath}`);
    }

    // ── Summary ────────────────────────────────────────────────────────────
    const nu = nativeResult.usage;
    const bu = brickResult.usage;
    const rawDelta = nu.total > 0 ? ((bu.total - nu.total) / nu.total) * 100 : NaN;
    const deltaPct = isNaN(rawDelta) ? 'n/a' : `${rawDelta > 0 ? '+' : ''}${rawDelta.toFixed(1)}%`;

    console.log('\n══ Summary ══════════════════════════════════════════');
    console.log(`  Brick          : ${brick}`);
    console.log(`  Framing        : ${framing}`);
    console.log(`  Native tokens  : ${nu.total.toLocaleString('en-US')}`);
    console.log(`  Brick tokens   : ${bu.total.toLocaleString('en-US')}`);
    console.log(`  Delta          : ${deltaPct}`);
    console.log(`  Native turns   : ${nativeResult.turns}  |  Brick turns: ${brickResult.turns}`);
    console.log(`  Native exit    : ${nativeResult.exit_reason}  |  Brick exit: ${brickResult.exit_reason}`);
    if (fichePath) console.log(`  Fiche          : ${fichePath}`);
    console.log('═══════════════════════════════════════════════════\n');
}

main().catch((err: unknown) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
