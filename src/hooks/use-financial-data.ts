'use client';

import { useFinancialData } from '@/providers/financial-provider';
import {
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
  Investment,
} from '@/types/financial';

export function useWealthData() {
  const { wealthRecords, assetAccounts, exchangeRate, loading, refreshWealth } =
    useFinancialData();
  return {
    records: wealthRecords as WealthRecord[],
    accounts: assetAccounts as AssetAccount[],
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
    records: incomeRecords as IncomeRecord[],
    categories: incomeCategories as IncomeCategory[],
    exchangeRate,
    loading,
    refresh: refreshIncome,
  };
}

export function useExpenseData() {
  const {
    expenseRecords,
    expenseCategories,
    exchangeRate,
    loading,
    refreshExpenses,
    refreshExpenseCategories,
  } = useFinancialData();
  return {
    records: expenseRecords as ExpenseRecord[],
    categories: expenseCategories as ExpenseCategory[],
    exchangeRate,
    loading,
    refresh: refreshExpenses,
    refreshCategories: refreshExpenseCategories,
  };
}

export function useBudgetData() {
  const {
    budgetExpenses,
    budgetTodoItems,
    exchangeRate,
    loading,
    refreshBudget,
  } = useFinancialData();
  return {
    expenses: budgetExpenses as BudgetExpense[],
    todoItems: budgetTodoItems as BudgetTodoItem[],
    exchangeRate,
    loading,
    refresh: refreshBudget,
  };
}

export function useMortgageData() {
  const { mortgages, mortgagePayments, loading, refreshMortgage } =
    useFinancialData();
  return {
    mortgage: mortgages[0] as Mortgage | undefined,
    payments: mortgagePayments as MortgagePayment[],
    loading,
    refresh: refreshMortgage,
  };
}

export function useRecurringPaymentsData() {
  const { recurringPayments, loading, refreshRecurringPayments } =
    useFinancialData();
  return {
    records: recurringPayments as RecurringPayment[],
    loading,
    refresh: refreshRecurringPayments,
  };
}

export function useInvestmentData() {
  const { investments, loading, refreshInvestments } = useFinancialData();
  return {
    investments: investments as Investment[],
    loading,
    refresh: refreshInvestments,
  };
}
