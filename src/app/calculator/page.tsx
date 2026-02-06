import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchIncomeRecords, fetchInvestments } from '@/lib/queries';
import { CalculatorClient } from './calculator-client';

export default async function CalculatorPage() {
  let incomeRecords: Awaited<ReturnType<typeof fetchIncomeRecords>> = [];
  let investments: Awaited<ReturnType<typeof fetchInvestments>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [incomeRecords, investments] = await Promise.all([
      fetchIncomeRecords(supabase),
      fetchInvestments(supabase),
    ]);
  } catch {
    // Server fetch failed -- client hooks will refetch
  }

  return (
    <CalculatorClient
      initialIncomeRecords={incomeRecords}
      initialInvestments={investments}
    />
  );
}
