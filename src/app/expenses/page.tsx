import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchExpenseRecords, fetchExpenseCategories } from '@/lib/queries';
import { ExpensesClient } from './expenses-client';

export default async function ExpensesPage() {
  let expenses: Awaited<ReturnType<typeof fetchExpenseRecords>> = [];
  let categories: Awaited<ReturnType<typeof fetchExpenseCategories>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [expenses, categories] = await Promise.all([
      fetchExpenseRecords(supabase),
      fetchExpenseCategories(supabase),
    ]);
  } catch {
    // Server fetch failed (e.g. test env) — client hooks will refetch
  }

  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialCategories={categories}
    />
  );
}
