import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchInvestments } from '@/lib/queries';
import { PortfolioClient } from './portfolio-client';

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient();
  const investments = await fetchInvestments(supabase);

  return <PortfolioClient initialInvestments={investments} />;
}
