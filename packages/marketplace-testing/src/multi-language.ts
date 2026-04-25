/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { BrickLike } from './run-tool.js';

/**
 * Runs `assertion` against each fixture/language pair.
 * If the brick's manifest declares `supportedLanguages`, fixtures with a primary
 * language not in that list are skipped. If the field is absent (default for
 * official bricks), every fixture is exercised.
 *
 * @param brick - the brick under test
 * @param fixtures - map of fixture name → primary language
 * @param assertion - async fn called per fixture; receives (fixtureName, language)
 */
export async function testMultiLanguage(
    brick: BrickLike,
    fixtures: Record<string, string>,
    assertion: (fixtureName: string, language: string) => Promise<void>,
): Promise<void> {
    const declared: string[] | undefined = (
        brick as { manifest?: { supportedLanguages?: string[] } }
    ).manifest?.supportedLanguages;

    for (const [fixtureName, language] of Object.entries(fixtures)) {
        if (declared && !declared.includes(language)) {
            // Brick opts out of this language — skip cleanly.
            continue;
        }
        await assertion(fixtureName, language);
    }
}
