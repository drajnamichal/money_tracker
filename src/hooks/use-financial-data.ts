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

export function useExchangeRate() {
  return useQuery({
    queryKey: queryKeys.exchangeRate,
    queryFn: fetchExchangeRate,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ---------------------------------------------------------------------------
// Wealth
// ---------------------------------------------------------------------------

export function useWealthData() {
  const accountsQuery = useQuery({
    queryKey: queryKeys.wealth.accounts,
    queryFn: fetchAssetAccounts,
  });
  const recordsQuery = useQuery({
    queryKey: queryKeys.wealth.records,
    queryFn: fetchWealthRecords,
  });
  const exchangeRateQuery = useExchangeRate();

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

export function useIncomeData() {
  const categoriesQuery = useQuery({
    queryKey: queryKeys.income.categories,
    queryFn: fetchIncomeCategories,
  });
  const recordsQuery = useQuery({
    queryKey: queryKeys.income.records,
    queryFn: fetchIncomeRecords,
  });
  const exchangeRateQuery = useExchangeRate();

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

export function useExpenseData() {
  const recordsQuery = useQuery({
    queryKey: queryKeys.expenses.records,
    queryFn: fetchExpenseRecords,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.expenses.categories,
    queryFn: fetchExpenseCategories,
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
    queryFn: fetchBudgetExpenses,
  });
  const todosQuery = useQuery({
    queryKey: queryKeys.budget.todos,
    queryFn: fetchBudgetTodoItems,
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
    queryFn: fetchMortgages,
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.mortgage.payments,
    queryFn: fetchMortgagePayments,
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

export function useRecurringPaymentsData() {
  const query = useQuery({
    queryKey: queryKeys.recurringPayments,
    queryFn: fetchRecurringPayments,
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
    queryFn: fetchRetirementRecords,
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

export function useInvestmentData() {
  const query = useQuery({
    queryKey: queryKeys.investments,
    queryFn: fetchInvestments,
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
