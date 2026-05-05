import { supabase } from "../db/client.js";
import { logger } from "../utils/logger.js";

export interface Store {
  id: number;
  name: string;
  storeUrl: string;
  accessToken: string;
  isActive: boolean;
}

let cachedStore: Store | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getActiveStore(): Promise<Store | null> {
  if (cachedStore && Date.now() - cacheTime < CACHE_TTL) return cachedStore;

  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  cachedStore = {
    id: data.id,
    name: data.name,
    storeUrl: data.store_url,
    accessToken: data.access_token,
    isActive: data.is_active,
  };
  cacheTime = Date.now();
  return cachedStore;
}

export async function addStore(params: {
  name: string;
  storeUrl: string;
  accessToken: string;
  configuredBy: number;
}): Promise<Store> {
  let url = params.storeUrl.trim().toLowerCase();
  if (!url.includes(".myshopify.com")) url = `${url}.myshopify.com`;
  url = url.replace(/^https?:\/\//, "");

  // Deactivate others
  await supabase.from("stores").update({ is_active: false }).eq("is_active", true);

  const { data, error } = await supabase
    .from("stores")
    .upsert(
      {
        name: params.name,
        store_url: url,
        access_token: params.accessToken,
        is_active: true,
        configured_by: params.configuredBy,
      },
      { onConflict: "store_url" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  cachedStore = null;
  cacheTime = 0;

  logger.info("Store configured", { name: params.name, storeUrl: url });

  return {
    id: data.id,
    name: params.name,
    storeUrl: url,
    accessToken: params.accessToken,
    isActive: true,
  };
}

export async function listStores(): Promise<Store[]> {
  const { data } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    storeUrl: r.store_url,
    accessToken: r.access_token,
    isActive: r.is_active,
  }));
}

export async function removeStore(storeId: number): Promise<boolean> {
  const { error } = await supabase.from("stores").delete().eq("id", storeId);
  cachedStore = null;
  cacheTime = 0;
  return !error;
}

export function invalidateCache(): void {
  cachedStore = null;
  cacheTime = 0;
}
