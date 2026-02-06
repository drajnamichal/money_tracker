import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { ExpenseFormValues } from '@/components/expenses/expense-form';

// Mock framer-motion to render children without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockCategories = [
  {
    id: '1',
    name: 'Potraviny',
    subcategories: [
      { id: '1a', name: 'Supermarket', parent_id: '1' },
      { id: '1b', name: 'Bio', parent_id: '1' },
    ],
  },
  {
    id: '2',
    name: 'Doprava',
    subcategories: [
      { id: '2a', name: 'MHD', parent_id: '2' },
    ],
  },
];

describe('ExpenseForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  function renderForm(props?: Partial<React.ComponentProps<typeof ExpenseForm>>) {
    return render(
      <ExpenseForm
        groupedCategories={mockCategories}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  }

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByLabelText('Popis')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategória')).toBeInTheDocument();
    expect(screen.getByLabelText('Čiastka (€)')).toBeInTheDocument();
    expect(screen.getByText('Uložiť')).toBeInTheDocument();
    expect(screen.getByText('Zrušiť')).toBeInTheDocument();
  });

  it('renders grouped category options', () => {
    renderForm();
    const select = screen.getByTestId('expense-category-select');
    // Check optgroups exist
    expect(select.querySelectorAll('optgroup')).toHaveLength(2);
    // Check options
    expect(screen.getByText('Supermarket')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
    expect(screen.getByText('MHD')).toBeInTheDocument();
  });

  it('shows fallback option when no categories', () => {
    renderForm({ groupedCategories: [] });
    expect(screen.getByText('Ostatné: nezaradené')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', async () => {
    renderForm();
    await userEvent.click(screen.getByText('Zrušiť'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors when submitting empty form', async () => {
    renderForm();
    await userEvent.click(screen.getByText('Uložiť'));

    await waitFor(() => {
      expect(screen.getByText('Popis je povinný')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid amount', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Popis'), 'Test');
    // Select a category
    await userEvent.selectOptions(
      screen.getByTestId('expense-category-select'),
      'Potraviny: Supermarket'
    );
    await userEvent.type(screen.getByLabelText('Čiastka (€)'), '-5');
    await userEvent.click(screen.getByText('Uložiť'));

    await waitFor(() => {
      expect(screen.getByText('Suma musí byť kladné číslo')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid data', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Popis'), 'Lidl nakup');
    await userEvent.selectOptions(
      screen.getByTestId('expense-category-select'),
      'Potraviny: Supermarket'
    );
    await userEvent.type(screen.getByLabelText('Čiastka (€)'), '42.50');
    await userEvent.click(screen.getByText('Uložiť'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = mockOnSubmit.mock.calls[0][0] as ExpenseFormValues;
    expect(submitted.description).toBe('Lidl nakup');
    expect(submitted.category).toBe('Potraviny: Supermarket');
    expect(Number(submitted.amount)).toBe(42.5);
    expect(submitted.record_date).toBeTruthy(); // has default date
  });

  it('exposes setValue via setValueRef for OCR pre-filling', async () => {
    let setter: ((name: keyof ExpenseFormValues, value: string) => void) | null = null;

    renderForm({
      setValueRef: (fn) => {
        setter = fn;
      },
    });

    expect(setter).not.toBeNull();

    // Simulate OCR pre-fill
    setter!('description', 'Tesco');
    setter!('amount', '15.99');

    await waitFor(() => {
      expect(screen.getByLabelText('Popis')).toHaveValue('Tesco');
      expect(screen.getByLabelText('Čiastka (€)')).toHaveValue(15.99);
    });
  });
});
