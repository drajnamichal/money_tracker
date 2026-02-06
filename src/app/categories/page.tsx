import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchExpenseCategories } from '@/lib/queries';
import { CategoriesClient } from './categories-client';

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof fetchExpenseCategories>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    categories = await fetchExpenseCategories(supabase);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return <CategoriesClient initialCategories={categories} />;
}
