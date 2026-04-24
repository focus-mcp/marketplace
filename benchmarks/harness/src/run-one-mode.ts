/**
 * run-one-mode.ts — Debug shim: runs a single mode for one brick.
 *
 * Usage:
 *   pnpm tsx src/run-one-mode.ts --brick filelist --mode native [--out-dir ./results]
 *   pnpm tsx src/run-one-mode.ts --brick filelist --mode brick --task-spec-path results/filelist-native-xxx.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { runOneMode, loadManifest, type Framing, type Mode } from './runner.js';

function parseArgs(): {
    brick: string;
    mode: Mode;
    framing: Framing;
    outDir: string;
    maxTurns: number;
    taskSpecPath: string | null;
} {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let brick = '';
    let mode: Mode | '' = '';
    let framing: Framing = 'minimal';
    let outDir = './results';
    let maxTurns = 20;
    let taskSpecPath: string | null = null;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--brick':           brick = args[++i] ?? ''; break;
            case '--mode':            mode = (args[++i] ?? '') as Mode; break;
            case '--framing':         framing = (args[++i] ?? 'minimal') as Framing; break;
            case '--out-dir':         outDir = args[++i] ?? './results'; break;
            case '--max-turns':       maxTurns = parseInt(args[++i] ?? '20', 10); break;
            case '--task-spec-path':  taskSpecPath = args[++i] ?? null; break;
        }
    }

    if (!brick) { console.error('ERROR: --brick <name> is required'); process.exit(1); }
    if (mode !== 'native' && mode !== 'brick') {
        console.error('ERROR: --mode <native|brick> is required'); process.exit(1);
    }
    if (mode === 'brick' && !taskSpecPath) {
        console.error('ERROR: --task-spec-path <native.json> is required for brick mode'); process.exit(1);
    }

    return { brick, mode, framing, outDir, maxTurns, taskSpecPath };
}

async function main() {
    const { brick, mode, framing, outDir, maxTurns, taskSpecPath } = parseArgs();
    const manifest = loadManifest(brick);

    let taskSpec: string | undefined;
    if (mode === 'brick' && taskSpecPath) {
        const nativeJson = JSON.parse(fs.readFileSync(path.resolve(taskSpecPath), 'utf-8')) as { mini_task_spec?: string };
        if (!nativeJson.mini_task_spec) {
            console.error(`ERROR: ${taskSpecPath} has no mini_task_spec field`);
            process.exit(1);
        }
        taskSpec = nativeJson.mini_task_spec;
        console.log(`Task spec loaded (${taskSpec.length} chars)`);
    }

    console.log(`\nRunning ${mode} mode for brick "${brick}" (framing=${framing})`);
    const result = await runOneMode({ brick, mode, framing, maxTurns, outDir, taskSpec, manifest });

    console.log('\n--- Result ---');
    console.log(`exit_reason : ${result.exit_reason}`);
    console.log(`turns       : ${result.turns}`);
    console.log(`total tokens: ${result.usage.total.toLocaleString('en-US')}`);
    console.log(`tools_used  : ${result.tools_used.join(', ') || '(none)'}`);
    if (mode === 'native' && result.mini_task_spec) {
        console.log(`\n## Mini-task spec:\n${result.mini_task_spec}`);
    }
    if (result.result_block) {
        console.log(`\n${result.result_block}`);
    }
}

main().catch((err: unknown) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
