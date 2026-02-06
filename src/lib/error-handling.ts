import { toast } from 'sonner';

/**
 * Standardised error handling for the entire app.
 *
 * Two functions cover every Supabase + catch pattern:
 *
 * 1. `assertSuccess(error, context)` — call right after a Supabase query.
 *    Throws a descriptive Error if the query failed, otherwise does nothing.
 *
 * 2. `showError(error, fallback)` — call inside catch blocks.
 *    Logs the error and shows a Slovak toast notification.
 */

// ---------------------------------------------------------------------------
// Supabase response guard
// ---------------------------------------------------------------------------

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Assert that a Supabase operation succeeded.
 * If it didn't, log the error and throw so the surrounding catch block can
 * call `showError()`.
 *
 * @example
 * ```ts
 * const { error } = await supabase.from('expenses').insert([row]);
 * assertSuccess(error, 'Pridanie výdavku');
 * ```
 */
export function assertSuccess(
  error: SupabaseError | null,
  context?: string
): asserts error is null {
  if (!error) return;

  const prefix = context ? `${context}: ` : '';
  console.error('[Supabase]', prefix + error.message, {
    code: error.code,
    details: error.details,
  });
  throw new Error(prefix + error.message);
}

// ---------------------------------------------------------------------------
// Catch-block handler
// ---------------------------------------------------------------------------

/**
 * Handle any caught error: log it and show a toast.
 *
 * @example
 * ```ts
 * try {
 *   …
 * } catch (err) {
 *   showError(err, 'Chyba pri ukladaní');
 * }
 * ```
 */
export function showError(
  error: unknown,
  fallbackMessage = 'Nastala neočakávaná chyba'
): void {
  console.error('[Error]', error);
  const message =
    error instanceof Error ? error.message : fallbackMessage;
  toast.error(message);
}
