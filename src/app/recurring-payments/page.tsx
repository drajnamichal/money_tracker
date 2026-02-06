import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchRecurringPayments } from '@/lib/queries';
import { RecurringPaymentsClient } from './recurring-payments-client';

export default async function RecurringPaymentsPage() {
  const supabase = await createServerSupabaseClient();
  const payments = await fetchRecurringPayments(supabase);

  return (
    <RecurringPaymentsClient
      initialPayments={payments as { id: string; name: string; amount: number; last_amount?: number; frequency: 'monthly' | 'yearly' }[]}
    />
  );
}
