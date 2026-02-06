import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchIncomeRecords, fetchIncomeCategories, fetchExchangeRate } from '@/lib/queries';
import { IncomeClient } from './income-client';

export default async function IncomePage() {
  let records: Awaited<ReturnType<typeof fetchIncomeRecords>> = [];
  let categories: Awaited<ReturnType<typeof fetchIncomeCategories>> = [];
  let exchangeRate = 25.0;

  try {
    const supabase = await createServerSupabaseClient();
    [records, categories, exchangeRate] = await Promise.all([
      fetchIncomeRecords(supabase),
      fetchIncomeCategories(supabase),
      fetchExchangeRate(),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return (
    <IncomeClient
      initialRecords={records}
      initialCategories={categories}
      initialExchangeRate={exchangeRate}
    />
  );
}
