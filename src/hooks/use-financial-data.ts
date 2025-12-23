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
  const {
    expenseRecords,
    expenseCategories,
    loading,
    refreshExpenses,
    refreshExpenseCategories,
  } = useFinancialData();
  return {
    records: expenseRecords,
    categories: expenseCategories,
    loading,
    refresh: refreshExpenses,
    refreshCategories: refreshExpenseCategories,
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
