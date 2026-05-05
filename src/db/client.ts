import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "../env.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
});

export async function healthCheck(): Promise<boolean> {
  try {
    const { error } = await supabase.from("telegram_config").select("id").limit(1);
    if (!error) return true;
    if (error.code === "PGRST116") return true;
    return false;
  } catch {
    return false;
  }
}
