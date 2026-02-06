import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchExpenseRecords, fetchExpenseCategories } from '@/lib/queries';
import { ExpensesClient } from './expenses-client';

export default async function ExpensesPage() {
  const supabase = await createServerSupabaseClient();

  const [expenses, categories] = await Promise.all([
    fetchExpenseRecords(supabase),
    fetchExpenseCategories(supabase),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialCategories={categories}
    />
  );
}
