import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchInvestments } from '@/lib/queries';
import { PortfolioClient } from './portfolio-client';

export default async function PortfolioPage() {
  let investments: Awaited<ReturnType<typeof fetchInvestments>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    investments = await fetchInvestments(supabase);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return <PortfolioClient initialInvestments={investments} />;
}
