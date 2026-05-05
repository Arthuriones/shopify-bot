import { getActiveStore } from "./store.js";
import { logger } from "../utils/logger.js";

interface ShopifyResponse<T> {
  data: T | null;
  error: string | null;
}

async function getBaseConfig(): Promise<{
  baseUrl: string;
  token: string;
} | null> {
  const store = await getActiveStore();
  if (!store) return null;
  return {
    baseUrl: `https://${store.storeUrl}/admin/api/2024-10`,
    token: store.accessToken,
  };
}

async function shopifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ShopifyResponse<T>> {
  const config = await getBaseConfig();
  if (!config) {
    return {
      data: null,
      error:
        "Nenhuma loja configurada. Use /config pra conectar sua Shopify.",
    };
  }

  const url = `${config.baseUrl}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.token,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("Shopify API error", {
        status: res.status,
        endpoint,
        body,
      });
      return { data: null, error: `Shopify ${res.status}: ${body}` };
    }

    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Shopify fetch failed", { endpoint, error: msg });
    return { data: null, error: msg };
  }
}

export async function shopifyGet<T>(endpoint: string) {
  return shopifyFetch<T>(endpoint);
}

export async function shopifyPost<T>(endpoint: string, body: unknown) {
  return shopifyFetch<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function shopifyPut<T>(endpoint: string, body: unknown) {
  return shopifyFetch<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function shopifyDelete(endpoint: string) {
  return shopifyFetch(endpoint, { method: "DELETE" });
}
