'use client';

import { useFinancialData } from '@/providers/financial-provider';

export function useWealthData() {
  const { wealthRecords, assetAccounts, exchangeRate, loading, refreshWealth } =
    useFinancialData();
  return {
    records: wealthRecords,
    accounts: assetAccounts,
    exchangeRate,
    loading,
    refresh: refreshWealth,
  };
}

export function useIncomeData() {
  const {
    incomeRecords,
    incomeCategories,
    exchangeRate,
    loading,
    refreshIncome,
  } = useFinancialData();
  return {
    records: incomeRecords,
    categories: incomeCategories,
    exchangeRate,
    loading,
    refresh: refreshIncome,
  };
}

export function useExpenseData() {
  const { expenseRecords, loading, refreshExpenses } = useFinancialData();
  return {
    records: expenseRecords,
    loading,
    refresh: refreshExpenses,
  };
}

export function useBudgetData() {
  const { budgetExpenses, budgetTodoItems, loading, refreshBudget } =
    useFinancialData();
  return {
    expenses: budgetExpenses,
    todoItems: budgetTodoItems,
    loading,
    refresh: refreshBudget,
  };
}
