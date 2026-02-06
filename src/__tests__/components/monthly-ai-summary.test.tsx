import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlyAISummary } from '@/components/expenses/monthly-ai-summary';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/lib/error-handling', () => ({
  showError: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockExpenses = [
  {
    id: '1',
    record_date: '2024-01-15',
    description: 'Lidl',
    category: 'Potraviny',
    amount: 45,
    amount_eur: 45,
    currency: 'EUR' as const,
  },
];

describe('MonthlyAISummary', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders the trigger button initially', () => {
    render(
      <MonthlyAISummary month="2024-01" expenses={mockExpenses} total={45} />
    );
    expect(screen.getByText('AI Analýza mesiaca')).toBeInTheDocument();
  });

  it('shows loading state when button clicked', async () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <MonthlyAISummary month="2024-01" expenses={mockExpenses} total={45} />
    );

    await userEvent.click(screen.getByText('AI Analýza mesiaca'));
    expect(screen.getByText('Analyzujem...')).toBeInTheDocument();
  });

  it('displays summary after successful API call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: 'Výdavky sú v norme.' }),
    });

    render(
      <MonthlyAISummary month="2024-01" expenses={mockExpenses} total={45} />
    );

    await userEvent.click(screen.getByText('AI Analýza mesiaca'));

    await waitFor(() => {
      expect(screen.getByText('Výdavky sú v norme.')).toBeInTheDocument();
    });

    // Button should no longer be visible
    expect(screen.queryByText('AI Analýza mesiaca')).not.toBeInTheDocument();
  });

  it('sends correct data to API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: 'OK' }),
    });

    render(
      <MonthlyAISummary month="2024-01" expenses={mockExpenses} total={45} />
    );

    await userEvent.click(screen.getByText('AI Analýza mesiaca'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/expense-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: '2024-01',
          expenses: mockExpenses,
          total: 45,
        }),
      });
    });
  });

  it('calls showError on API failure', async () => {
    const { showError } = require('@/lib/error-handling');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Rate limited' }),
    });

    render(
      <MonthlyAISummary month="2024-01" expenses={mockExpenses} total={45} />
    );

    await userEvent.click(screen.getByText('AI Analýza mesiaca'));

    await waitFor(() => {
      expect(showError).toHaveBeenCalled();
    });
  });
});
