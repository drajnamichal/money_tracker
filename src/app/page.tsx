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
  const supabase = await createServerSupabaseClient();

  const [wealth, income, expenses, investments, mortgages, recurringPayments] =
    await Promise.all([
      fetchWealthRecords(supabase),
      fetchIncomeRecords(supabase),
      fetchExpenseRecords(supabase),
      fetchInvestments(supabase),
      fetchMortgages(supabase),
      fetchRecurringPayments(supabase),
    ]);

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
