import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchRetirementRecords } from '@/lib/queries';
import { RetirementClient } from './retirement-client';

export default async function RetirementPage() {
  let records: Awaited<ReturnType<typeof fetchRetirementRecords>> = [];

  try {
    const supabase = await createServerSupabaseClient();
    records = await fetchRetirementRecords(supabase);
  } catch {
    // Server fetch failed — client hooks will refetch
  }

  return <RetirementClient initialRecords={records} />;
}
