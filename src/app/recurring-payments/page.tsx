import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  fetchRecurringPayments,
  fetchRecurringPaymentHistory,
} from '@/lib/queries';
import { RecurringPaymentsClient } from './recurring-payments-client';

export default async function RecurringPaymentsPage() {
  let payments: Awaited<ReturnType<typeof fetchRecurringPayments>> = [];
  let history: Awaited<ReturnType<typeof fetchRecurringPaymentHistory>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [payments, history] = await Promise.all([
      fetchRecurringPayments(supabase),
      fetchRecurringPaymentHistory(supabase),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return (
    <RecurringPaymentsClient
      initialPayments={payments}
      initialHistory={history}
    />
  );
}
