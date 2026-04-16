// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import { echo, parseEchoInput } from './echo.ts';

export type { EchoInput, EchoOutput } from './echo.ts';
export { echo, parseEchoInput } from './echo.ts';

/**
 * Minimal structural types for the Brick contract. Mirrors `@focusmcp/core`
 * without introducing a runtime dependency — the hello-world brick stays
 * self-contained.
 */
interface BrickBus {
  on(
    event: string,
    handler: (data: unknown) => Promise<unknown> | unknown,
  ): undefined | (() => void);
}

interface BrickContext {
  readonly bus: BrickBus;
}

/**
 * Local manifest type: structural shape of `mcp-brick.json`. Deliberately
 * omits fields that belong in `package.json` (e.g. `version`) so the brick
 * never reads them from the manifest by accident.
 */
interface BrickManifest {
  readonly name: string;
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly tools: readonly { readonly name: string; readonly description: string }[];
  readonly tags?: readonly string[];
  readonly license?: string;
}

interface Brick {
  readonly manifest: BrickManifest;
  start(ctx: BrickContext): Promise<void> | void;
  stop(): Promise<void> | void;
}

let unsubscribeEchoSay: undefined | (() => void);

const brick: Brick = {
  manifest: manifestJson,
  start(ctx) {
    unsubscribeEchoSay?.();
    unsubscribeEchoSay = ctx.bus.on('echo:say', (data) => echo(parseEchoInput(data)));
  },
  stop() {
    unsubscribeEchoSay?.();
    unsubscribeEchoSay = undefined;
  },
};

export default brick;
