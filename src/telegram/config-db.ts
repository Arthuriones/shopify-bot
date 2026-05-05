import { supabase } from "../db/client.js";
import { logger } from "../utils/logger.js";

export interface TelegramConfig {
  id: number;
  botToken: string;
  botName: string;
  allowedChatIds: number[];
  isActive: boolean;
}

let cached: TelegramConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached;

  const { data } = await supabase
    .from("telegram_config")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  cached = {
    id: data.id,
    botToken: data.bot_token,
    botName: data.bot_name,
    allowedChatIds: (data.allowed_chat_ids ?? []).map(Number),
    isActive: data.is_active,
  };
  cacheTime = Date.now();
  return cached;
}

export async function saveTelegramConfig(params: {
  botToken: string;
  botName: string;
  allowedChatIds: number[];
}): Promise<TelegramConfig> {
  await supabase
    .from("telegram_config")
    .update({ is_active: false })
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("telegram_config")
    .insert({
      bot_token: params.botToken,
      bot_name: params.botName,
      allowed_chat_ids: params.allowedChatIds,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  cached = null;
  cacheTime = 0;

  logger.info("Telegram config saved", { botName: params.botName });

  return {
    id: data.id,
    botToken: params.botToken,
    botName: params.botName,
    allowedChatIds: params.allowedChatIds,
    isActive: true,
  };
}

export async function updateAllowedChats(chatIds: number[]): Promise<void> {
  await supabase
    .from("telegram_config")
    .update({ allowed_chat_ids: chatIds, updated_at: new Date().toISOString() })
    .eq("is_active", true);
  cached = null;
  cacheTime = 0;
}

export function invalidateConfigCache(): void {
  cached = null;
  cacheTime = 0;
}
