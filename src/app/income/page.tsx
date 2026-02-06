import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  fetchIncomeRecords,
  fetchIncomeCategories,
  fetchExchangeRate,
} from '@/lib/queries';
import { IncomeClient } from './income-client';

export default async function IncomePage() {
  const supabase = await createServerSupabaseClient();

  const [records, categories, exchangeRate] = await Promise.all([
    fetchIncomeRecords(supabase),
    fetchIncomeCategories(supabase),
    fetchExchangeRate(),
  ]);

  return (
    <IncomeClient
      initialRecords={records}
      initialCategories={categories}
      initialExchangeRate={exchangeRate}
    />
  );
}
