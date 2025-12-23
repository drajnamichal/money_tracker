'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';

interface FinancialContextType {
  wealthRecords: any[];
  incomeRecords: any[];
  expenseRecords: any[];
  budgetExpenses: any[];
  budgetTodoItems: any[];
  assetAccounts: any[];
  incomeCategories: any[];
  expenseCategories: any[];
  exchangeRate: number;
  loading: boolean;
  refreshWealth: () => Promise<void>;
  refreshIncome: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshExpenseCategories: () => Promise<void>;
  refreshBudget: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(
  undefined
);

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const [wealthRecords, setWealthRecords] = useState<any[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<any[]>([]);
  const [budgetExpenses, setBudgetExpenses] = useState<any[]>([]);
  const [budgetTodoItems, setBudgetTodoItems] = useState<any[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(25.0); // Default fallback
  const [loading, setLoading] = useState(true);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const response = await fetch(
        'https://api.frankfurter.app/latest?from=EUR&to=CZK'
      );
      const data = await response.json();
      if (data.rates && data.rates.CZK) {
        setExchangeRate(data.rates.CZK);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  }, []);

  const fetchWealth = useCallback(async () => {
    const { data: accounts } = await supabase
      .from('asset_accounts')
      .select('*')
      .order('name');
    const { data: records } = await supabase
      .from('wealth_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (accounts) setAssetAccounts(accounts);
    if (records) setWealthRecords(records);
  }, []);

  const fetchIncome = useCallback(async () => {
    const { data: categories } = await supabase
      .from('income_categories')
      .select('*')
      .order('name');
    const { data: records } = await supabase
      .from('income_records')
      .select('*, income_categories(name)')
      .order('record_month', { ascending: false });
    if (categories) setIncomeCategories(categories);
    if (records) setIncomeRecords(records);
  }, []);

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from('expense_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (data) setExpenseRecords(data);
  }, []);

  const fetchExpenseCategories = useCallback(async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');
    if (data) setExpenseCategories(data);
  }, []);

  const fetchBudget = useCallback(async () => {
    const { data: expenses } = await supabase
      .from('budget_expenses')
      .select('*')
      .order('created_at', { ascending: false });
    const { data: todoItems } = await supabase
      .from('budget_todo_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (expenses) setBudgetExpenses(expenses);
    if (todoItems) setBudgetTodoItems(todoItems);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchWealth(),
      fetchIncome(),
      fetchExpenses(),
      fetchExpenseCategories(),
      fetchBudget(),
      fetchExchangeRate(),
    ]);
    setLoading(false);
  }, [
    fetchWealth,
    fetchIncome,
    fetchExpenses,
    fetchExpenseCategories,
    fetchBudget,
    fetchExchangeRate,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <FinancialContext.Provider
      value={{
        wealthRecords,
        incomeRecords,
        expenseRecords,
        budgetExpenses,
        budgetTodoItems,
        assetAccounts,
        incomeCategories,
        expenseCategories,
        exchangeRate,
        loading,
        refreshWealth: fetchWealth,
        refreshIncome: fetchIncome,
        refreshExpenses: fetchExpenses,
        refreshExpenseCategories: fetchExpenseCategories,
        refreshBudget: fetchBudget,
        refreshAll,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancialData() {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a FinancialProvider');
  }
  return context;
}
