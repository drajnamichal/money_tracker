import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
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
  RecurringPayment,
  RetirementRecord,
  Investment,
} from '@/types/financial';

// ---------------------------------------------------------------------------
// Query Keys – central registry to avoid typos and enable targeted invalidation
// ---------------------------------------------------------------------------

export const queryKeys = {
  wealth: {
    accounts: ['wealth', 'accounts'] as const,
    records: ['wealth', 'records'] as const,
  },
  income: {
    categories: ['income', 'categories'] as const,
    records: ['income', 'records'] as const,
  },
  expenses: {
    records: ['expenses', 'records'] as const,
    categories: ['expenses', 'categories'] as const,
  },
  budget: {
    expenses: ['budget', 'expenses'] as const,
    todos: ['budget', 'todos'] as const,
  },
  mortgage: {
    loans: ['mortgage', 'loans'] as const,
    payments: ['mortgage', 'payments'] as const,
  },
  recurringPayments: ['recurring-payments'] as const,
  retirement: ['retirement'] as const,
  investments: ['investments'] as const,
  exchangeRate: ['exchange-rate'] as const,
} as const;

// ---------------------------------------------------------------------------
// Helper — resolve Supabase client (server or browser)
// ---------------------------------------------------------------------------

type SB = SupabaseClient;

/** Use the provided server client, or fall back to the browser client */
function sb(client?: SB): SB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client ?? supabase) as any;
}

// ---------------------------------------------------------------------------
// Fetch Functions — accept optional server client for SSR, fall back to browser
// ---------------------------------------------------------------------------

export async function fetchAssetAccounts(client?: SB): Promise<AssetAccount[]> {
  const { data, error } = await sb(client)
    .from('asset_accounts')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as AssetAccount[];
}

export async function fetchWealthRecords(client?: SB): Promise<WealthRecord[]> {
  const { data, error } = await sb(client)
    .from('wealth_records')
    .select('*')
    .order('record_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WealthRecord[];
}

export async function fetchIncomeCategories(client?: SB): Promise<IncomeCategory[]> {
  const { data, error } = await sb(client)
    .from('income_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as IncomeCategory[];
}

export async function fetchIncomeRecords(client?: SB): Promise<IncomeRecord[]> {
  const { data, error } = await sb(client)
    .from('income_records')
    .select('*, income_categories(name)')
    .order('record_month', { ascending: false });
  if (error) throw error;
  return (data ?? []) as IncomeRecord[];
}

export async function fetchExpenseRecords(client?: SB): Promise<ExpenseRecord[]> {
  const { data, error } = await sb(client)
    .from('expense_records')
    .select('*')
    .order('record_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExpenseRecord[];
}

export async function fetchExpenseCategories(client?: SB): Promise<ExpenseCategory[]> {
  const { data, error } = await sb(client)
    .from('expense_categories')
    .select('id, name, parent_id, icon, color')
    .order('name');
  if (error) throw error;
  return (data ?? []) as ExpenseCategory[];
}

export async function fetchBudgetExpenses(client?: SB): Promise<BudgetExpense[]> {
  const { data, error } = await sb(client)
    .from('budget_expenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BudgetExpense[];
}

export async function fetchBudgetTodoItems(client?: SB): Promise<BudgetTodoItem[]> {
  const { data, error } = await sb(client)
    .from('budget_todo_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BudgetTodoItem[];
}

export async function fetchMortgages(client?: SB): Promise<Mortgage[]> {
  const { data, error } = await sb(client)
    .from('mortgages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mortgage[];
}

export async function fetchMortgagePayments(client?: SB): Promise<MortgagePayment[]> {
  const { data, error } = await sb(client)
    .from('mortgage_payments')
    .select('*')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MortgagePayment[];
}

export async function fetchRecurringPayments(client?: SB): Promise<RecurringPayment[]> {
  const { data, error } = await sb(client)
    .from('recurring_payments')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as RecurringPayment[];
}

export async function fetchRetirementRecords(client?: SB): Promise<RetirementRecord[]> {
  const { data, error } = await sb(client)
    .from('retirement_records')
    .select('*')
    .order('record_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RetirementRecord[];
}

export async function fetchInvestments(client?: SB): Promise<Investment[]> {
  const { data, error } = await sb(client)
    .from('investments')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Investment[];
}

export async function fetchExchangeRate(): Promise<number> {
  const response = await fetch(
    'https://api.frankfurter.app/latest?from=EUR&to=CZK'
  );
  const data = await response.json();
  if (data.rates && data.rates.CZK) {
    return data.rates.CZK as number;
  }
  return 25.0; // fallback
}
