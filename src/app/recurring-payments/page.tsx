import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchRecurringPayments } from '@/lib/queries';
import { RecurringPaymentsClient } from './recurring-payments-client';

export default async function RecurringPaymentsPage() {
  let payments: Awaited<ReturnType<typeof fetchRecurringPayments>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    payments = await fetchRecurringPayments(supabase);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return (
    <RecurringPaymentsClient
      initialPayments={payments as { id: string; name: string; amount: number; last_amount?: number; frequency: 'monthly' | 'yearly' }[]}
    />
  );
}
