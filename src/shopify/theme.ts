import { shopifyGet, shopifyPut } from "./client.js";
import { logger } from "../utils/logger.js";

interface ShopifyTheme {
  id: number;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface ThemeList {
  themes: ShopifyTheme[];
}

interface ShopifyAsset {
  key: string;
  value?: string;
  content_type: string;
  updated_at: string;
}

interface AssetResponse {
  asset: ShopifyAsset;
}

interface AssetListResponse {
  assets: Array<{ key: string; content_type: string; updated_at: string }>;
}

async function getMainThemeId(): Promise<number | null> {
  const res = await shopifyGet<ThemeList>("/themes.json");
  if (res.error || !res.data) return null;

  const main = res.data.themes.find((t) => t.role === "main");
  return main?.id ?? null;
}

export async function listThemes(): Promise<string> {
  const res = await shopifyGet<ThemeList>("/themes.json");
  if (res.error) return `Erro: ${res.error}`;

  const themes = res.data?.themes ?? [];
  return themes
    .map(
      (t) =>
        `• ${t.name} (${t.role}) [ID: ${t.id}]`
    )
    .join("\n");
}

export async function listAssets(themeId?: number): Promise<string> {
  const id = themeId ?? (await getMainThemeId());
  if (!id) return "Erro: não encontrei o tema principal.";

  const res = await shopifyGet<AssetListResponse>(
    `/themes/${id}/assets.json`
  );
  if (res.error) return `Erro: ${res.error}`;

  const assets = res.data?.assets ?? [];
  const grouped: Record<string, string[]> = {};

  for (const a of assets) {
    const folder = a.key.split("/")[0] ?? "root";
    if (!grouped[folder]) grouped[folder] = [];
    grouped[folder].push(a.key);
  }

  return Object.entries(grouped)
    .map(([folder, files]) => `<b>${folder}/</b>\n${files.map((f) => `  ${f}`).join("\n")}`)
    .join("\n\n");
}

export async function readAsset(
  assetKey: string,
  themeId?: number
): Promise<string> {
  const id = themeId ?? (await getMainThemeId());
  if (!id) return "Erro: não encontrei o tema principal.";

  const res = await shopifyGet<AssetResponse>(
    `/themes/${id}/assets.json?asset[key]=${encodeURIComponent(assetKey)}`
  );
  if (res.error) return `Erro: ${res.error}`;

  const value = res.data?.asset.value;
  if (!value) return `Arquivo ${assetKey} está vazio ou é binário.`;

  // Truncate if too large for Telegram
  if (value.length > 3000) {
    return `<b>${assetKey}</b> (truncado, ${value.length} chars):\n<pre>${escapeHtml(value.slice(0, 3000))}...</pre>`;
  }

  return `<b>${assetKey}</b>:\n<pre>${escapeHtml(value)}</pre>`;
}

export async function updateAsset(
  assetKey: string,
  newValue: string,
  themeId?: number
): Promise<string> {
  const id = themeId ?? (await getMainThemeId());
  if (!id) return "Erro: não encontrei o tema principal.";

  const res = await shopifyPut<AssetResponse>(
    `/themes/${id}/assets.json`,
    { asset: { key: assetKey, value: newValue } }
  );

  if (res.error) return `Erro ao atualizar: ${res.error}`;

  logger.info("Theme asset updated", { themeId: id, assetKey });
  return `Arquivo <b>${assetKey}</b> atualizado no tema.`;
}

export async function findAndReplace(
  assetKey: string,
  search: string,
  replace: string,
  themeId?: number
): Promise<string> {
  const id = themeId ?? (await getMainThemeId());
  if (!id) return "Erro: não encontrei o tema principal.";

  // Read current content
  const res = await shopifyGet<AssetResponse>(
    `/themes/${id}/assets.json?asset[key]=${encodeURIComponent(assetKey)}`
  );
  if (res.error) return `Erro ao ler: ${res.error}`;

  const current = res.data?.asset.value;
  if (!current) return `Arquivo ${assetKey} está vazio ou é binário.`;

  if (!current.includes(search)) {
    return `Texto "${search}" não encontrado em ${assetKey}.`;
  }

  const updated = current.replace(search, replace);
  return updateAsset(assetKey, updated, id);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
