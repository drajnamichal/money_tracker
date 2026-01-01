'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import {
  AssetAccount,
  WealthRecord,
  IncomeCategory,
  IncomeRecord,
  ExpenseCategory,
  ExpenseRecord,
  BudgetExpense,
  BudgetTodoItem,
  Mortgage,
  MortgagePayment,
} from '@/types/financial';

interface FinancialContextType {
  wealthRecords: WealthRecord[];
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  budgetExpenses: BudgetExpense[];
  budgetTodoItems: BudgetTodoItem[];
  assetAccounts: AssetAccount[];
  incomeCategories: IncomeCategory[];
  expenseCategories: ExpenseCategory[];
  mortgages: Mortgage[];
  mortgagePayments: MortgagePayment[];
  exchangeRate: number;
  loading: boolean;
  refreshWealth: () => Promise<void>;
  refreshIncome: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshExpenseCategories: () => Promise<void>;
  refreshBudget: () => Promise<void>;
  refreshMortgage: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(
  undefined
);

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  const [wealthRecords, setWealthRecords] = useState<WealthRecord[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [budgetExpenses, setBudgetExpenses] = useState<BudgetExpense[]>([]);
  const [budgetTodoItems, setBudgetTodoItems] = useState<BudgetTodoItem[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>(
    []
  );
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    []
  );
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [mortgagePayments, setMortgagePayments] = useState<MortgagePayment[]>(
    []
  );
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
    if (accounts) setAssetAccounts(accounts as AssetAccount[]);
    if (records) setWealthRecords(records as WealthRecord[]);
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
    if (categories) setIncomeCategories(categories as IncomeCategory[]);
    if (records) setIncomeRecords(records as IncomeRecord[]);
  }, []);

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from('expense_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (data) setExpenseRecords(data as ExpenseRecord[]);
  }, []);

  const fetchExpenseCategories = useCallback(async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');
    if (data) setExpenseCategories(data as ExpenseCategory[]);
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
    if (expenses) setBudgetExpenses(expenses as BudgetExpense[]);
    if (todoItems) setBudgetTodoItems(todoItems as BudgetTodoItem[]);
  }, []);

  const fetchMortgage = useCallback(async () => {
    const { data: mortgageData } = await supabase
      .from('mortgages')
      .select('*')
      .order('created_at', { ascending: false });
    const { data: paymentsData } = await supabase
      .from('mortgage_payments')
      .select('*')
      .order('payment_date', { ascending: false });
    if (mortgageData) setMortgages(mortgageData as Mortgage[]);
    if (paymentsData) setMortgagePayments(paymentsData as MortgagePayment[]);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchWealth(),
      fetchIncome(),
      fetchExpenses(),
      fetchExpenseCategories(),
      fetchBudget(),
      fetchMortgage(),
      fetchExchangeRate(),
    ]);
    setLoading(false);
  }, [
    fetchWealth,
    fetchIncome,
    fetchExpenses,
    fetchExpenseCategories,
    fetchBudget,
    fetchMortgage,
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
        mortgages,
        mortgagePayments,
        exchangeRate,
        loading,
        refreshWealth: fetchWealth,
        refreshIncome: fetchIncome,
        refreshExpenses: fetchExpenses,
        refreshExpenseCategories: fetchExpenseCategories,
        refreshBudget: fetchBudget,
        refreshMortgage: fetchMortgage,
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
