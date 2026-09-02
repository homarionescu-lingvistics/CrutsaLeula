import { createClient } from "@/lib/supabase/server";

export type KosonTransaction = {
  id: string;
  amount: number;
  description: string;
  created_at: string;
};

export async function getKosonTransactions(userId: string): Promise<KosonTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("koson_transactions")
    .select("id, amount, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data as KosonTransaction[];
}
