import type { Context } from "grammy";
import { sendFormatted } from "./formatter.js";
import { addStore, getActiveStore, listStores, removeStore } from "../shopify/store.js";
import { logger } from "../utils/logger.js";

// State machine per chat for the config flow
interface ConfigState {
  step: "name" | "url" | "token" | "confirm";
  name?: string;
  url?: string;
  token?: string;
}

const configSessions = new Map<number, ConfigState>();

export function isInConfigFlow(chatId: number): boolean {
  return configSessions.has(chatId);
}

export async function handleConfigCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = ctx.message?.text?.trim() ?? "";
  const args = text.replace("/config", "").trim();

  // /config status — show current store
  if (args === "status" || args === "") {
    const store = await getActiveStore();
    if (!store) {
      await sendFormatted(
        ctx,
        "Nenhuma loja configurada.\n\nUse <b>/config nova</b> pra conectar uma Shopify."
      );
      return;
    }
    await sendFormatted(
      ctx,
      [
        "<b>Loja ativa:</b>",
        `Nome: ${store.name}`,
        `URL: ${store.storeUrl}`,
        `Token: ${store.accessToken.slice(0, 8)}...${store.accessToken.slice(-4)}`,
        "",
        "/config nova — conectar outra loja",
        "/config listar — ver todas",
      ].join("\n")
    );
    return;
  }

  // /config listar
  if (args === "listar") {
    const stores = await listStores();
    if (stores.length === 0) {
      await ctx.reply("Nenhuma loja cadastrada.");
      return;
    }
    const list = stores
      .map(
        (s) =>
          `${s.isActive ? "●" : "○"} <b>${s.name}</b> — ${s.storeUrl} [ID: ${s.id}]`
      )
      .join("\n");
    await sendFormatted(ctx, `<b>Lojas:</b>\n${list}`);
    return;
  }

  // /config remover <id>
  if (args.startsWith("remover")) {
    const id = Number(args.replace("remover", "").trim());
    if (!id) {
      await ctx.reply("Use: /config remover <id>");
      return;
    }
    const ok = await removeStore(id);
    await ctx.reply(ok ? `Loja ${id} removida.` : `Loja ${id} não encontrada.`);
    return;
  }

  // /config nova — start flow
  if (args === "nova") {
    configSessions.set(chatId, { step: "name" });
    await sendFormatted(
      ctx,
      "<b>Configurar nova loja Shopify</b>\n\nQual o <b>nome</b> da loja? (ex: Minha Loja)"
    );
    return;
  }

  await sendFormatted(
    ctx,
    [
      "<b>Comandos de config:</b>",
      "/config — ver loja ativa",
      "/config nova — conectar loja",
      "/config listar — ver todas",
      "/config remover &lt;id&gt; — remover loja",
    ].join("\n")
  );
}

export async function handleConfigStep(ctx: Context): Promise<boolean> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text?.trim();
  if (!chatId || !text) return false;

  const state = configSessions.get(chatId);
  if (!state) return false;

  // Cancel
  if (text.toLowerCase() === "cancelar") {
    configSessions.delete(chatId);
    await ctx.reply("Configuração cancelada.");
    return true;
  }

  switch (state.step) {
    case "name":
      state.name = text;
      state.step = "url";
      await sendFormatted(
        ctx,
        `Nome: <b>${text}</b>\n\nAgora mande a <b>URL da loja</b> (ex: minha-loja ou minha-loja.myshopify.com)`
      );
      return true;

    case "url":
      state.url = text;
      state.step = "token";
      await sendFormatted(
        ctx,
        `URL: <b>${text}</b>\n\nAgora mande o <b>Access Token</b> da Shopify (shpat_...)\n\n<i>Pra gerar: Shopify Admin → Settings → Apps → Develop apps → Create app → API credentials</i>`
      );
      return true;

    case "token":
      state.token = text;
      state.step = "confirm";
      await sendFormatted(
        ctx,
        [
          "<b>Confirma esses dados?</b>",
          "",
          `Nome: ${state.name}`,
          `URL: ${state.url}`,
          `Token: ${text.slice(0, 8)}...${text.slice(-4)}`,
          "",
          "Responda <b>sim</b> ou <b>cancelar</b>",
        ].join("\n")
      );
      return true;

    case "confirm":
      if (text.toLowerCase() === "sim") {
        try {
          const store = await addStore({
            name: state.name!,
            storeUrl: state.url!,
            accessToken: state.token!,
            configuredBy: chatId,
          });

          configSessions.delete(chatId);
          await sendFormatted(
            ctx,
            `Loja <b>${store.name}</b> (${store.storeUrl}) conectada!\n\nAgora pode mandar comandos como:\n• "lista meus produtos"\n• "cria produto Camiseta Preta 79,90"`
          );

          logger.info("Store configured via Telegram", {
            chatId,
            storeName: store.name,
          });
        } catch (err) {
          configSessions.delete(chatId);
          await ctx.reply(
            `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      } else {
        configSessions.delete(chatId);
        await ctx.reply("Configuração cancelada.");
      }
      return true;

    default:
      configSessions.delete(chatId);
      return false;
  }
}
