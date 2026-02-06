import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchExpenseCategories } from '@/lib/queries';
import { CategoriesClient } from './categories-client';

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient();
  const categories = await fetchExpenseCategories(supabase);

  return <CategoriesClient initialCategories={categories} />;
}
