describe('getOpenAIKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules so env.ts re-evaluates process.env
    jest.resetModules();
    process.env = {
      ...originalEnv,
      // Always provide Supabase vars so clientEnv doesn't throw on import
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns OPENAI_API_KEY when set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key-1';
    // Dynamic import to pick up new env
    const { getOpenAIKey } = require('../lib/env');
    expect(getOpenAIKey()).toBe('sk-test-key-1');
  });

  it('returns OPEN_API_KEY as fallback', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPEN_API_KEY = 'sk-test-key-2';
    const { getOpenAIKey } = require('../lib/env');
    expect(getOpenAIKey()).toBe('sk-test-key-2');
  });

  it('returns OPENAI_KEY as last fallback', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPEN_API_KEY;
    process.env.OPENAI_KEY = 'sk-test-key-3';
    const { getOpenAIKey } = require('../lib/env');
    expect(getOpenAIKey()).toBe('sk-test-key-3');
  });

  it('returns undefined when no keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPEN_API_KEY;
    delete process.env.OPENAI_KEY;
    const { getOpenAIKey } = require('../lib/env');
    expect(getOpenAIKey()).toBeUndefined();
  });

  it('prefers OPENAI_API_KEY over others when multiple are set', () => {
    process.env.OPENAI_API_KEY = 'primary';
    process.env.OPEN_API_KEY = 'secondary';
    process.env.OPENAI_KEY = 'tertiary';
    const { getOpenAIKey } = require('../lib/env');
    expect(getOpenAIKey()).toBe('primary');
  });
});

describe('clientEnv validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when SUPABASE_URL is missing', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    };

    expect(() => require('../lib/env')).toThrow();
  });

  it('throws when SUPABASE_URL is not a valid URL', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    };

    expect(() => require('../lib/env')).toThrow();
  });

  it('throws when ANON_KEY is empty', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    };

    expect(() => require('../lib/env')).toThrow();
  });

  it('succeeds with valid env vars', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-key',
    };

    const { clientEnv } = require('../lib/env');
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('valid-key');
  });
});
