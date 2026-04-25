/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

export { getRealFixture, getSyntheticFixture } from './fixtures.js';
export { expectMatchesGolden, type GoldenMetrics, readMetrics } from './goldens.js';
export * as invariants from './invariants/index.js';
export { testMultiLanguage } from './multi-language.js';
export { type BrickLike, runTool } from './run-tool.js';
export { createSandbox, type Sandbox } from './sandbox.js';
