'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  fetchAssetAccounts,
  fetchWealthRecords,
  fetchIncomeCategories,
  fetchIncomeRecords,
  fetchExpenseRecords,
  fetchExpenseCategories,
  fetchBudgetExpenses,
  fetchBudgetTodoItems,
  fetchMortgages,
  fetchMortgagePayments,
  fetchRecurringPayments,
  fetchRetirementRecords,
  fetchInvestments,
  fetchExchangeRate,
} from '@/lib/queries';
import type {
  WealthRecord,
  AssetAccount,
  IncomeRecord,
  IncomeCategory,
  ExpenseRecord,
  ExpenseCategory,
  BudgetExpense,
  BudgetTodoItem,
  Mortgage,
  MortgagePayment,
  RecurringPayment,
  RetirementRecord,
  Investment,
} from '@/types/financial';

// ---------------------------------------------------------------------------
// Shared: Exchange Rate (1 hour stale time – external API, rarely changes)
// ---------------------------------------------------------------------------

export function useExchangeRate(initial?: number) {
  return useQuery({
    queryKey: queryKeys.exchangeRate,
    queryFn: fetchExchangeRate,
    staleTime: 60 * 60 * 1000,
    initialData: initial,
  });
}

// ---------------------------------------------------------------------------
// Wealth
// ---------------------------------------------------------------------------

export interface WealthDataOptions {
  initialRecords?: WealthRecord[];
  initialAccounts?: AssetAccount[];
  initialExchangeRate?: number;
}

export function useWealthData(options?: WealthDataOptions) {
  const accountsQuery = useQuery({
    queryKey: queryKeys.wealth.accounts,
    queryFn: () => fetchAssetAccounts(),
    initialData: options?.initialAccounts,
  });
  const recordsQuery = useQuery({
    queryKey: queryKeys.wealth.records,
    queryFn: () => fetchWealthRecords(),
    initialData: options?.initialRecords,
  });
  const exchangeRateQuery = useExchangeRate(options?.initialExchangeRate);

  return {
    records: (recordsQuery.data ?? []) as WealthRecord[],
    accounts: (accountsQuery.data ?? []) as AssetAccount[],
    exchangeRate: exchangeRateQuery.data ?? 25.0,
    loading: accountsQuery.isLoading || recordsQuery.isLoading,
    refresh: async () => {
      await Promise.all([accountsQuery.refetch(), recordsQuery.refetch()]);
    },
  };
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

export interface IncomeDataOptions {
  initialRecords?: IncomeRecord[];
  initialCategories?: IncomeCategory[];
  initialExchangeRate?: number;
}

export function useIncomeData(options?: IncomeDataOptions) {
  const categoriesQuery = useQuery({
    queryKey: queryKeys.income.categories,
    queryFn: () => fetchIncomeCategories(),
    initialData: options?.initialCategories,
  });
  const recordsQuery = useQuery({
    queryKey: queryKeys.income.records,
    queryFn: () => fetchIncomeRecords(),
    initialData: options?.initialRecords,
  });
  const exchangeRateQuery = useExchangeRate(options?.initialExchangeRate);

  return {
    records: (recordsQuery.data ?? []) as IncomeRecord[],
    categories: (categoriesQuery.data ?? []) as IncomeCategory[],
    exchangeRate: exchangeRateQuery.data ?? 25.0,
    loading: categoriesQuery.isLoading || recordsQuery.isLoading,
    refresh: async () => {
      await Promise.all([categoriesQuery.refetch(), recordsQuery.refetch()]);
    },
  };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface ExpenseDataOptions {
  initialRecords?: ExpenseRecord[];
  initialCategories?: ExpenseCategory[];
}

export function useExpenseData(options?: ExpenseDataOptions) {
  const recordsQuery = useQuery({
    queryKey: queryKeys.expenses.records,
    queryFn: () => fetchExpenseRecords(),
    initialData: options?.initialRecords,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.expenses.categories,
    queryFn: () => fetchExpenseCategories(),
    initialData: options?.initialCategories,
  });
  const exchangeRateQuery = useExchangeRate();

  return {
    records: (recordsQuery.data ?? []) as ExpenseRecord[],
    categories: (categoriesQuery.data ?? []) as ExpenseCategory[],
    exchangeRate: exchangeRateQuery.data ?? 25.0,
    loading: recordsQuery.isLoading || categoriesQuery.isLoading,
    refresh: async () => {
      await recordsQuery.refetch();
    },
    refreshCategories: async () => {
      await categoriesQuery.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export function useBudgetData() {
  const expensesQuery = useQuery({
    queryKey: queryKeys.budget.expenses,
    queryFn: () => fetchBudgetExpenses(),
  });
  const todosQuery = useQuery({
    queryKey: queryKeys.budget.todos,
    queryFn: () => fetchBudgetTodoItems(),
  });
  const exchangeRateQuery = useExchangeRate();

  return {
    expenses: (expensesQuery.data ?? []) as BudgetExpense[],
    todoItems: (todosQuery.data ?? []) as BudgetTodoItem[],
    exchangeRate: exchangeRateQuery.data ?? 25.0,
    loading: expensesQuery.isLoading || todosQuery.isLoading,
    refresh: async () => {
      await Promise.all([expensesQuery.refetch(), todosQuery.refetch()]);
    },
  };
}

// ---------------------------------------------------------------------------
// Mortgage
// ---------------------------------------------------------------------------

export function useMortgageData() {
  const mortgagesQuery = useQuery({
    queryKey: queryKeys.mortgage.loans,
    queryFn: () => fetchMortgages(),
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.mortgage.payments,
    queryFn: () => fetchMortgagePayments(),
  });

  const mortgages = (mortgagesQuery.data ?? []) as Mortgage[];

  return {
    mortgage: mortgages[0] as Mortgage | undefined,
    payments: (paymentsQuery.data ?? []) as MortgagePayment[],
    loading: mortgagesQuery.isLoading || paymentsQuery.isLoading,
    refresh: async () => {
      await Promise.all([mortgagesQuery.refetch(), paymentsQuery.refetch()]);
    },
  };
}

// ---------------------------------------------------------------------------
// Recurring Payments
// ---------------------------------------------------------------------------

export function useRecurringPaymentsData(options?: {
  initialRecords?: RecurringPayment[];
}) {
  const query = useQuery({
    queryKey: queryKeys.recurringPayments,
    queryFn: () => fetchRecurringPayments(),
    initialData: options?.initialRecords,
  });

  return {
    records: (query.data ?? []) as RecurringPayment[],
    loading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Retirement
// ---------------------------------------------------------------------------

export function useRetirementData() {
  const query = useQuery({
    queryKey: queryKeys.retirement,
    queryFn: () => fetchRetirementRecords(),
  });

  return {
    records: (query.data ?? []) as RetirementRecord[],
    loading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export function useInvestmentData(options?: {
  initialInvestments?: Investment[];
}) {
  const query = useQuery({
    queryKey: queryKeys.investments,
    queryFn: () => fetchInvestments(),
    initialData: options?.initialInvestments,
  });

  return {
    investments: (query.data ?? []) as Investment[],
    loading: query.isLoading,
    refresh: async () => {
      await query.refetch();
    },
  };
}

// ---------------------------------------------------------------------------
// Refresh All — used by Settings page to invalidate all cached data
// ---------------------------------------------------------------------------

export function useRefreshAll() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries();
  };
}
