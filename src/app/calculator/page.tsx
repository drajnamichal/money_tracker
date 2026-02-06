import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchIncomeRecords, fetchInvestments } from '@/lib/queries';
import { CalculatorClient } from './calculator-client';

export default async function CalculatorPage() {
  const supabase = await createServerSupabaseClient();

  const [incomeRecords, investments] = await Promise.all([
    fetchIncomeRecords(supabase),
    fetchInvestments(supabase),
  ]);

  return (
    <CalculatorClient
      initialIncomeRecords={incomeRecords}
      initialInvestments={investments}
    />
  );
}
