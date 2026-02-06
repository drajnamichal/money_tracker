import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchMortgages, fetchMortgagePayments } from '@/lib/queries';
import { MortgageClient } from './mortgage-client';

export default async function MortgagePage() {
  let mortgages: Awaited<ReturnType<typeof fetchMortgages>> = [];
  let payments: Awaited<ReturnType<typeof fetchMortgagePayments>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [mortgages, payments] = await Promise.all([
      fetchMortgages(supabase),
      fetchMortgagePayments(supabase),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return <MortgageClient initialMortgages={mortgages} initialPayments={payments} />;
}
