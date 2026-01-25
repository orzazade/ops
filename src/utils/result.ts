import { ok, err, Result } from 'neverthrow';

/**
 * Type guard to check if a PromiseSettledResult is fulfilled.
 * Critical for TypeScript to narrow the type correctly.
 */
export function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

/**
 * Type guard to check if a PromiseSettledResult is rejected.
 */
export function isRejected<T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

/**
 * Convert a PromiseSettledResult to a neverthrow Result.
 * Enables type-safe error handling with Promise.allSettled.
 */
export function mapSettledResult<T>(result: PromiseSettledResult<T>): Result<T, Error> {
  if (result.status === 'fulfilled') {
    return ok(result.value);
  }
  return err(new Error(String(result.reason)));
}

/**
 * Extract fulfilled values from Promise.allSettled results.
 * Uses type predicate to ensure TypeScript correctly narrows the type.
 *
 * CRITICAL: Must use `is` keyword in type predicate for proper narrowing.
 */
export function extractSettledResults<T>(results: PromiseSettledResult<T>[]): T[] {
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);
}
