import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function healthCheck(): Promise<boolean> {
  try {
    const { error } = await supabase.from("telegram_config").select("id").limit(1);
    // No error or empty table = connection works
    if (!error) return true;
    // 404 means table not found, but connection works
    if (error.code === "PGRST116") return true;
    return false;
  } catch {
    return false;
  }
}
