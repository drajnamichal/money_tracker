import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesClient } from '@/app/expenses/expenses-client';

const mockReplace = jest.fn();
const mockUseExpenseData = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/expenses',
  useSearchParams: () => mockSearchParams,
}));

jest.mock('framer-motion', () => {
  const React = require('react');

  const MotionDiv = React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<Record<string, unknown>>
  >(({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  MotionDiv.displayName = 'MotionDiv';

  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

jest.mock('recharts', () => {
  const React = require('react');
  const SvgContainer = ({ children }: React.PropsWithChildren) => (
    <svg>{children}</svg>
  );
  const SvgChild = ({ children }: React.PropsWithChildren) => <g>{children}</g>;

  return {
    AreaChart: SvgContainer,
    Area: SvgChild,
    CartesianGrid: SvgChild,
    ResponsiveContainer: SvgContainer,
    Tooltip: () => null,
    XAxis: SvgChild,
    YAxis: SvgChild,
    BarChart: SvgContainer,
    Bar: SvgChild,
    Cell: SvgChild,
  };
});

jest.mock('@/hooks/use-financial-data', () => ({
  useExpenseData: (options: unknown) => mockUseExpenseData(options),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
      update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
    })),
  },
}));

jest.mock('@/lib/image-utils', () => ({
  compressImage: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/error-handling', () => ({
  assertSuccess: jest.fn(),
  showError: jest.fn(),
}));

jest.mock('@/components/expenses/expense-form', () => ({
  ExpenseForm: () => <div data-testid="expense-form">Expense form</div>,
}));

jest.mock('@/components/expenses/category-manager', () => ({
  CategoryManager: () => <div data-testid="category-manager">Category manager</div>,
}));

jest.mock('@/components/expenses/expense-category-sidebar', () => ({
  ExpenseCategorySidebar: ({ expenses }: { expenses: unknown[] }) => (
    <div data-testid="expense-sidebar">Sidebar {expenses.length}</div>
  ),
}));

jest.mock('@/components/expenses/monthly-ai-summary', () => ({
  MonthlyAISummary: ({
    month,
    isFocused,
  }: {
    month: string;
    isFocused?: boolean;
  }) => (
    <div data-testid={`ai-summary-${month}`}>
      {isFocused ? 'focused' : 'idle'}
    </div>
  ),
}));

const baseCategories = [
  { id: 'food', name: 'Potraviny', parent_id: null },
  { id: 'food-market', name: 'Supermarket', parent_id: 'food' },
];

function createExpense(month: string, amount: number, idSuffix: string) {
  return {
    id: `expense-${idSuffix}`,
    description: `Výdavok ${idSuffix}`,
    category: 'Potraviny: Supermarket',
    amount,
    amount_eur: amount,
    record_date: `${month}-15`,
    currency: 'EUR' as const,
  };
}

function setupExpenseData(months: Array<[string, number]>) {
  const records = months.map(([month, amount], index) =>
    createExpense(month, amount, `${index + 1}`)
  );

  mockUseExpenseData.mockReturnValue({
    records,
    categories: baseCategories,
    loading: false,
    refresh: jest.fn(),
    refreshCategories: jest.fn(),
  });
}

describe('ExpensesClient', () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockReplace.mockClear();
    mockUseExpenseData.mockReset();
    mockSearchParams = new URLSearchParams();
    jest.clearAllMocks();
    (Element.prototype.scrollIntoView as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hydrates selected month from URL and shows month comparison state', async () => {
    mockSearchParams = new URLSearchParams('month=2024-02&view=month');
    setupExpenseData([
      ['2024-01', 100],
      ['2024-02', 200],
      ['2024-03', 190],
    ]);

    render(
      <ExpensesClient initialExpenses={[]} initialCategories={baseCategories as any} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('O 100.0 % viac než minulý mesiac')
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('expense-sidebar')).toHaveTextContent('Sidebar 1');
    expect(
      screen.getByText(/február 2024 vs\. január 2024/i)
    ).toBeInTheDocument();
  });

  it('updates URL and scrolls to the selected month block', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    setupExpenseData([
      ['2024-01', 100],
      ['2024-02', 200],
      ['2024-03', 190],
    ]);

    render(
      <ExpensesClient initialExpenses={[]} initialCategories={baseCategories as any} />
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    mockReplace.mockClear();

    await user.click(screen.getByRole('button', { name: 'január 2024' }));

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenLastCalledWith(
        '/expenses?month=2024-01&view=month',
        { scroll: false }
      );
    });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId('expense-sidebar')).toHaveTextContent('Sidebar 1');
  });

  it('shows empty-state messaging when there are no expenses', () => {
    setupExpenseData([]);

    render(
      <ExpensesClient initialExpenses={[]} initialCategories={baseCategories as any} />
    );

    expect(
      screen.getByText('Zatiaľ nemáš žiadne výdavky na zobrazenie prehľadu.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Žiadne výdavky nenájdené. Začni pridaním prvého.')
    ).toBeInTheDocument();
  });

  it('renders every tracked month even for long expense histories', () => {
    setupExpenseData([
      ['2023-08', 120],
      ['2023-09', 130],
      ['2023-10', 140],
      ['2023-11', 150],
      ['2023-12', 160],
      ['2024-01', 170],
      ['2024-02', 180],
      ['2024-03', 190],
    ]);

    const { container } = render(
      <ExpensesClient initialExpenses={[]} initialCategories={baseCategories as any} />
    );

    const months = [
      '2023-08',
      '2023-09',
      '2023-10',
      '2023-11',
      '2023-12',
      '2024-01',
      '2024-02',
      '2024-03',
    ];

    months.forEach((month) => {
      expect(
        container.querySelector(`#expense-month-${month}`)
      ).not.toBeNull();
    });
  });
});
