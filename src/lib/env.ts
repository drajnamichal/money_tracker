import * as z from 'zod';

/**
 * Validate environment variables at import time.
 *
 * Public (client-safe) variables are required — the app cannot
 * function without Supabase. Server-only variables (OpenAI) are
 * optional so the app still boots when AI features are disabled.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL musí byť platná URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY je povinný'),
});

const serverSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPEN_API_KEY: z.string().min(1).optional(),
  OPENAI_KEY: z.string().min(1).optional(),
});

/** Validated public env vars (safe to use on client) */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/**
 * Get the OpenAI API key, checking all possible env var names.
 * Returns undefined if none are set (AI features will be disabled).
 * Only call this on the server (API routes).
 */
export function getOpenAIKey(): string | undefined {
  const parsed = serverSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPEN_API_KEY: process.env.OPEN_API_KEY,
    OPENAI_KEY: process.env.OPENAI_KEY,
  });
  return parsed.OPENAI_API_KEY || parsed.OPEN_API_KEY || parsed.OPENAI_KEY;
}
