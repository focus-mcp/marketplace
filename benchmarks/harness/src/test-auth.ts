/**
 * test-auth.ts — Validates that @anthropic-ai/claude-agent-sdk auth works.
 * Usage: pnpm tsx src/test-auth.ts
 */
import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
    console.log('Testing auth with claude-sonnet-4-6...');
    const startedAt = Date.now();

    const q = query({
        prompt: 'reply OK',
        options: {
            model: 'claude-sonnet-4-6',
            maxTurns: 1,
            allowedTools: [],
            disallowedTools: ['Bash', 'Read', 'Grep', 'Glob', 'Edit', 'Write'],
            permissionMode: 'bypassPermissions',
            allowDangerouslySkipPermissions: true,
        },
    });

    let resultMessage: { usage: unknown; subtype: string } | null = null;

    for await (const message of q) {
        if (message.type === 'assistant') {
            console.log('[assistant message received]');
            if (message.message?.usage) {
                console.log('  message.usage:', message.message.usage);
            }
        } else if (message.type === 'result') {
            resultMessage = message;
            console.log('\n[result]');
            console.log('  subtype:', message.subtype);
            console.log('  num_turns:', message.num_turns);
            if ('result' in message) {
                console.log('  result:', message.result);
            }
            if ('errors' in message) {
                console.error('  errors:', message.errors);
            }
            console.log('  usage:', message.usage);
        }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`\nDone in ${durationMs}ms`);

    if (!resultMessage) {
        console.error('ERROR: No result message received — auth may have failed');
        process.exit(1);
    }

    if (resultMessage.subtype !== 'success') {
        console.error(`ERROR: Result subtype was "${resultMessage.subtype}", expected "success"`);
        process.exit(1);
    }

    console.log('\nAuth OK');
}

main().catch((err: unknown) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
