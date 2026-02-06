import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  fetchWealthRecords,
  fetchAssetAccounts,
  fetchExchangeRate,
} from '@/lib/queries';
import { AssetsClient } from './assets-client';

export default async function AssetsPage() {
  const supabase = await createServerSupabaseClient();

  const [records, accounts, exchangeRate] = await Promise.all([
    fetchWealthRecords(supabase),
    fetchAssetAccounts(supabase),
    fetchExchangeRate(),
  ]);

  return (
    <AssetsClient
      initialRecords={records}
      initialAccounts={accounts}
      initialExchangeRate={exchangeRate}
    />
  );
}
