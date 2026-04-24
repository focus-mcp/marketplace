# Fiche brick — filewrite

**Domaine** : Write files — create, overwrite, append.
**Prefix** : `fw`
**Tools** : 3 (`write`, `append`, `create`)

## Metrics (iso-task)

| | Native | Brick | Δ |
|---|---:|---:|---:|
| Total tokens | 606,885 | 1,130,025 | +86.2% ⚠️ |
| cache_creation | 19,980 | 121,167 | |
| cache_read | 582,172 | 994,873 | |
| output | 4,689 | 13,879 | |
| Turns (SDK) | 17 | 18 | |
| Duration (s) | 74.7 | 236.6 | +217% ⚠️ |

## Mini-task (iso)

The `test-repo/packages/common/exceptions/` directory contains NestJS HTTP exception classes (e.g. `not-found.exception.ts`, `payload-too-large.exception.ts`). Each file follows a strict pattern: it imports `HttpStatus` from `../enums/http-status.enum` and `HttpException`/`HttpExceptionOptions` from `./http.exception`, defines a class extending `HttpException`, and has a constructor that calls `HttpException.extractDescriptionAndOptionsFrom` and `HttpException.createBody` with the appropriate `HttpStatus` member.

The `HttpStatus` enum in `test-repo/packages/common/enums/http-status.enum.ts` includes `TOO_MANY_REQUESTS = 429`, but the exceptions directory has **no** corresponding `too-many-requests.exception.ts` file.

**Task**: Create the file `test-repo/packages/common/exceptions/too-many-requests.exception.ts` with a `TooManyRequestsException` class that exactly follows the same pattern as the existing exception files. Use `HttpStatus.TOO_MANY_REQUESTS` for the status code and `'Too Many Requests'` as the default description string. The class name must be `TooManyRequestsException`.

**Expected answer format**: The exact content of the created file `test-repo/packages/common/exceptions/too-many-requests.exception.ts`, reproduced verbatim.

---

## Tool coverage (brick mode)

- `fw_write` : not called ⚠️
- `fw_append` : not called ⚠️
- `fw_create` : not called ⚠️

**Coverage score**: 0/3 tools used

## Answers comparison

**Native answer**: ```
import { HttpStatus } from '../enums/http-status.enum';
import { HttpException, HttpExceptionOptions } from './http.exception';
/**
 * Defines an HTTP exception for *Too Many Requests* type errors.
 *
... (51 total)
```

**Brick answer**: ```
import { HttpStatus } from '../enums/http-status.enum';
import { HttpException, HttpExceptionOptions } from './http.exception';
export class TooManyRequestsException extends HttpException {
  constructor(
    descriptionOrOptions: string | HttpExceptionOptions = 'Too Many Requests',
... (16 total)
```

**Match**: divergent (manual check needed)

## Observations

_(empty — to be filled in the qualitative analysis pass)_

## Auto-detected issues

- Tools not called: `fw_write`, `fw_append`, `fw_create`
- Turns > 15 (brick): 18
- Turns > 15 (native): 17
- Brick slower than native by 217% (UX concern)
- Brick uses MORE tokens than native (1,130,025 vs 606,885)

## Recommendations

_(empty — to be filled after analysis)_
