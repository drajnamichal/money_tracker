import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchBudgetExpenses, fetchBudgetTodoItems } from '@/lib/queries';
import { BudgetTrackerClient } from './budget-tracker-client';

export default async function BudgetTrackerPage() {
  const supabase = await createServerSupabaseClient();

  const [expenses, todos] = await Promise.all([
    fetchBudgetExpenses(supabase),
    fetchBudgetTodoItems(supabase),
  ]);

  return (
    <BudgetTrackerClient
      initialExpenses={expenses}
      initialTodos={todos}
    />
  );
}
