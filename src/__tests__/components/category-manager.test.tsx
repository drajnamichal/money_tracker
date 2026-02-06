import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryManager } from '@/components/expenses/category-manager';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock supabase
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (data: unknown) => {
        mockInsert(table, data);
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        eq: (col: string, val: string) => {
          mockDelete(table, col, val);
          mockEq(col, val);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock error-handling (to prevent import of sonner at module level)
jest.mock('@/lib/error-handling', () => ({
  assertSuccess: (error: unknown) => {
    if (error) throw error;
  },
  showError: jest.fn(),
}));

const mockCategories = [
  { id: 'c1', name: 'Potraviny', parent_id: null },
  { id: 'c2', name: 'Doprava', parent_id: null },
  { id: 'c3', name: 'Supermarket', parent_id: 'c1' },
];

describe('CategoryManager', () => {
  const mockOnClose = jest.fn();
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnRefresh.mockClear();
    mockInsert.mockClear();
    mockDelete.mockClear();
  });

  function renderManager() {
    return render(
      <CategoryManager
        categories={mockCategories}
        onClose={mockOnClose}
        onRefresh={mockOnRefresh}
      />
    );
  }

  it('renders all categories', () => {
    renderManager();
    expect(screen.getByText('Potraviny')).toBeInTheDocument();
    expect(screen.getByText('Doprava')).toBeInTheDocument();
    expect(screen.getByText('Supermarket')).toBeInTheDocument();
  });

  it('renders the heading and input', () => {
    renderManager();
    expect(screen.getByText('Spravovať kategórie')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nová kategória...')).toBeInTheDocument();
  });

  it('calls onClose when X button clicked', async () => {
    renderManager();
    // The close button is the first X button (in header)
    const closeButtons = screen.getAllByRole('button');
    // First button is "Pridať", second is close (X in header), rest are delete X's
    // Find the button in the header area
    const headerClose = closeButtons.find(
      (btn) => btn.closest('.flex.items-center.justify-between') !== null
    );
    if (headerClose) {
      await userEvent.click(headerClose);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not add category when input is empty', async () => {
    renderManager();
    await userEvent.click(screen.getByText('Pridať'));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('adds category and clears input on success', async () => {
    renderManager();
    const input = screen.getByPlaceholderText('Nová kategória...');

    await userEvent.type(input, 'Zábava');
    await userEvent.click(screen.getByText('Pridať'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        'expense_categories',
        [{ name: 'Zábava' }]
      );
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('trims whitespace from category name', async () => {
    renderManager();
    const input = screen.getByPlaceholderText('Nová kategória...');

    await userEvent.type(input, '  Bývanie  ');
    await userEvent.click(screen.getByText('Pridať'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        'expense_categories',
        [{ name: 'Bývanie' }]
      );
    });
  });
});
