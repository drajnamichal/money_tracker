import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchRetirementRecords } from '@/lib/queries';
import { RetirementClient } from './retirement-client';

export default async function RetirementPage() {
  const supabase = await createServerSupabaseClient();
  const records = await fetchRetirementRecords(supabase);

  return <RetirementClient initialRecords={records} />;
}
