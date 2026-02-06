import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  fetchWealthRecords,
  fetchIncomeRecords,
  fetchExpenseRecords,
  fetchInvestments,
  fetchMortgages,
} from '@/lib/queries';
import { FireClient } from './fire-client';

export default async function FirePage() {
  const supabase = await createServerSupabaseClient();

  const [wealth, income, expenses, investments, mortgages] = await Promise.all([
    fetchWealthRecords(supabase),
    fetchIncomeRecords(supabase),
    fetchExpenseRecords(supabase),
    fetchInvestments(supabase),
    fetchMortgages(supabase),
  ]);

  return (
    <FireClient
      initialWealth={wealth}
      initialIncome={income}
      initialExpenses={expenses}
      initialInvestments={investments}
      initialMortgages={mortgages}
    />
  );
}
