import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  fetchWealthRecords,
  fetchIncomeRecords,
  fetchExpenseRecords,
  fetchInvestments,
  fetchMortgages,
  fetchRecurringPayments,
} from '@/lib/queries';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  let wealth: Awaited<ReturnType<typeof fetchWealthRecords>> = [];
  let income: Awaited<ReturnType<typeof fetchIncomeRecords>> = [];
  let expenses: Awaited<ReturnType<typeof fetchExpenseRecords>> = [];
  let investments: Awaited<ReturnType<typeof fetchInvestments>> = [];
  let mortgages: Awaited<ReturnType<typeof fetchMortgages>> = [];
  let recurringPayments: Awaited<ReturnType<typeof fetchRecurringPayments>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [wealth, income, expenses, investments, mortgages, recurringPayments] =
      await Promise.all([
        fetchWealthRecords(supabase),
        fetchIncomeRecords(supabase),
        fetchExpenseRecords(supabase),
        fetchInvestments(supabase),
        fetchMortgages(supabase),
        fetchRecurringPayments(supabase),
      ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return (
    <DashboardClient
      initialWealth={wealth}
      initialIncome={income}
      initialExpenses={expenses}
      initialInvestments={investments}
      initialMortgages={mortgages}
      initialRecurringPayments={recurringPayments}
    />
  );
}
