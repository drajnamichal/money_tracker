import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchBudgetExpenses, fetchBudgetTodoItems } from '@/lib/queries';
import { BudgetTrackerClient } from './budget-tracker-client';

export default async function BudgetTrackerPage() {
  let expenses: Awaited<ReturnType<typeof fetchBudgetExpenses>> = [];
  let todos: Awaited<ReturnType<typeof fetchBudgetTodoItems>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    [expenses, todos] = await Promise.all([
      fetchBudgetExpenses(supabase),
      fetchBudgetTodoItems(supabase),
    ]);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return <BudgetTrackerClient initialExpenses={expenses} initialTodos={todos} />;
}
