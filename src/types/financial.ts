export interface AssetAccount {
  id: string;
  name: string;
  type: string;
  currency: 'EUR' | 'CZK';
  created_at?: string;
}

export interface WealthRecord {
  id: string;
  account_id: string;
  record_date: string;
  amount: number;
  amount_eur: number;
  created_at?: string;
}

export interface IncomeCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface IncomeRecord {
  id: string;
  record_month: string;
  description: string;
  category_id: string;
  amount: number;
  amount_eur: number;
  currency: 'EUR' | 'CZK';
  created_at?: string;
  income_categories?: {
    name: string;
  };
}

export interface ExpenseCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface ExpenseRecord {
  id: string;
  record_date: string;
  description: string;
  category: string;
  amount: number;
  amount_eur: number;
  currency: 'EUR' | 'CZK';
  created_at?: string;
  isOptimistic?: boolean;
}

export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
  is_fixed: boolean;
  attachment_url: string | null;
  created_at: string;
}

export interface BudgetTodoItem {
  id: string;
  text: string;
  created_at: string;
}
