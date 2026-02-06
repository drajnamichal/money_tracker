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
  let wealth: Awaited<ReturnType<typeof fetchWealthRecords>> = [];
  let income: Awaited<ReturnType<typeof fetchIncomeRecords>> = [];
  let expenses: Awaited<ReturnType<typeof fetchExpenseRecords>> = [];
  let investments: Awaited<ReturnType<typeof fetchInvestments>> = [];
  let mortgages: Awaited<ReturnType<typeof fetchMortgages>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [wealth, income, expenses, investments, mortgages] = await Promise.all([
      fetchWealthRecords(supabase),
      fetchIncomeRecords(supabase),
      fetchExpenseRecords(supabase),
      fetchInvestments(supabase),
      fetchMortgages(supabase),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

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
