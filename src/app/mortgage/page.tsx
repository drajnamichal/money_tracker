import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchMortgages, fetchMortgagePayments } from '@/lib/queries';
import { MortgageClient } from './mortgage-client';

export default async function MortgagePage() {
  const supabase = await createServerSupabaseClient();

  const [mortgages, payments] = await Promise.all([
    fetchMortgages(supabase),
    fetchMortgagePayments(supabase),
  ]);

  return (
    <MortgageClient
      initialMortgages={mortgages}
      initialPayments={payments}
    />
  );
}
