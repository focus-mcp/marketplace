// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

export interface EchoInput {
  readonly message: string;
}

export interface EchoOutput {
  readonly message: string;
}

/** Pure function: returns the message as-is. Extracted for direct testability. */
export function echo(input: EchoInput): EchoOutput {
  return { message: input.message };
}

/**
 * Runtime guard that validates untyped bus payloads before they reach `echo()`.
 * Throws a clear `TypeError` rather than letting invalid data produce
 * `{ message: undefined }` silently.
 */
export function parseEchoInput(data: unknown): EchoInput {
  if (
    data === null ||
    typeof data !== 'object' ||
    typeof (data as { message?: unknown }).message !== 'string'
  ) {
    throw new TypeError(
      'Invalid echo payload: expected an object with a string "message" property.',
    );
  }
  return data as EchoInput;
}
