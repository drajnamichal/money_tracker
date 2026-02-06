import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchWealthRecords, fetchAssetAccounts, fetchExchangeRate } from '@/lib/queries';
import { AssetsClient } from './assets-client';

export default async function AssetsPage() {
  let records: Awaited<ReturnType<typeof fetchWealthRecords>> = [];
  let accounts: Awaited<ReturnType<typeof fetchAssetAccounts>> = [];
  let exchangeRate = 25.0;

  try {
    const supabase = await createServerSupabaseClient();
    [records, accounts, exchangeRate] = await Promise.all([
      fetchWealthRecords(supabase),
      fetchAssetAccounts(supabase),
      fetchExchangeRate(),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return (
    <AssetsClient
      initialRecords={records}
      initialAccounts={accounts}
      initialExchangeRate={exchangeRate}
    />
  );
}
