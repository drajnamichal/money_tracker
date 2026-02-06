import { assertSuccess, showError } from '../lib/error-handling';
import { toast } from 'sonner';

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

describe('assertSuccess', () => {
  it('does nothing when error is null', () => {
    expect(() => assertSuccess(null)).not.toThrow();
  });

  it('does nothing when error is null with context', () => {
    expect(() => assertSuccess(null, 'Test context')).not.toThrow();
  });

  it('throws when error is present', () => {
    const error = { message: 'Something went wrong' };
    expect(() => assertSuccess(error)).toThrow('Something went wrong');
  });

  it('throws with context prefix', () => {
    const error = { message: 'DB connection failed' };
    expect(() => assertSuccess(error, 'Pridanie výdavku')).toThrow(
      'Pridanie výdavku: DB connection failed'
    );
  });

  it('includes error code and details in console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const error = {
      message: 'Duplicate key',
      code: '23505',
      details: 'Key (id)=(123) already exists',
    };

    expect(() => assertSuccess(error, 'Insert')).toThrow();
    expect(spy).toHaveBeenCalledWith(
      '[Supabase]',
      'Insert: Duplicate key',
      { code: '23505', details: 'Key (id)=(123) already exists' }
    );

    spy.mockRestore();
  });

  it('acts as type guard — narrows error to null after call', () => {
    const error: { message: string } | null = null;
    assertSuccess(error);
    // TypeScript should know error is null here
    const _proof: null = error;
    expect(_proof).toBeNull();
  });
});

describe('showError', () => {
  beforeEach(() => {
    mockedToastError.mockClear();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('shows Error message in toast', () => {
    showError(new Error('Network timeout'));
    expect(mockedToastError).toHaveBeenCalledWith('Network timeout');
  });

  it('uses fallback message for non-Error values', () => {
    showError('some string error', 'Chyba pri ukladaní');
    expect(mockedToastError).toHaveBeenCalledWith('Chyba pri ukladaní');
  });

  it('uses default fallback when no fallback provided', () => {
    showError(42);
    expect(mockedToastError).toHaveBeenCalledWith('Nastala neočakávaná chyba');
  });

  it('handles null error', () => {
    showError(null, 'Fallback');
    expect(mockedToastError).toHaveBeenCalledWith('Fallback');
  });

  it('handles undefined error', () => {
    showError(undefined);
    expect(mockedToastError).toHaveBeenCalledWith('Nastala neočakávaná chyba');
  });

  it('logs the error to console', () => {
    const error = new Error('Test');
    showError(error);
    expect(console.error).toHaveBeenCalledWith('[Error]', error);
  });
});
