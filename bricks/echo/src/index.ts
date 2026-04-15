// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import manifestJson from '../mcp-brick.json' with { type: 'json' };
import { type EchoInput, echo } from './echo.ts';

export type { EchoInput, EchoOutput } from './echo.ts';
export { echo } from './echo.ts';

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

interface Brick {
  readonly manifest: typeof manifestJson;
  start(ctx: BrickContext): Promise<void> | void;
  stop(): Promise<void> | void;
}

const brick: Brick = {
  manifest: manifestJson,
  start(ctx) {
    ctx.bus.on('echo:say', (data) => echo(data as EchoInput));
  },
  stop() {
    /* handler cleanup is managed by the EventBus when the registry stops the brick */
  },
};

export default brick;
