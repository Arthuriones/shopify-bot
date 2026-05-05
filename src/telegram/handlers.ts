import type { Context } from "grammy";
import { routeMessage } from "../triage/router.js";
import { dispatch } from "../agents/dispatcher.js";
import { sendFormatted } from "./formatter.js";
import { supabase } from "../db/client.js";
import { getMetrics24h } from "../llm/tokens.js";
import { listAgents } from "../agents/loader.js";
import { getActiveStore } from "../shopify/store.js";
import { getTelegramConfig } from "./config-db.js";
import { isInConfigFlow, handleConfigStep } from "./config-flow.js";
import { logger } from "../utils/logger.js";

async function isAllowed(chatId: number): Promise<boolean> {
  const config = await getTelegramConfig();
  if (!config) return false;
  if (config.allowedChatIds.length === 0) return true;
  return config.allowedChatIds.includes(chatId);
}

export async function handleStart(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId || !(await isAllowed(chatId))) {
    await ctx.reply("Acesso negado.");
    return;
  }

  const agents = listAgents();
  const agentList = agents.map((a) => `• <b>${a}</b>`).join("\n");
  const store = await getActiveStore();
  const storeStatus = store
    ? `Loja: <b>${store.name}</b> (${store.storeUrl})`
    : "Nenhuma loja conectada — use /config nova";

  await sendFormatted(
    ctx,
    [
      "<b>Shopify Bot ativo.</b>",
      "",
      storeStatus,
      "",
      "Agentes disponíveis:",
      agentList,
      "",
      "Comandos:",
      "• /config — configurar loja Shopify",
      "• /status — métricas de uso",
      "",
      "Ou mande qualquer mensagem em linguagem natural.",
    ].join("\n")
  );
}

export async function handleStatus(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId || !(await isAllowed(chatId))) return;

  const metrics = await getMetrics24h();

  const text = [
    "<b>Status (últimas 24h)</b>",
    "",
    `Calls: ${metrics.totalCalls}`,
    `Tokens in: ${metrics.tokensIn.toLocaleString()}`,
    `Tokens out: ${metrics.tokensOut.toLocaleString()}`,
    `Latência média: ${metrics.avgDurationMs}ms`,
    "",
    "<b>Top agentes:</b>",
    ...metrics.topAgents.map((a) => `• ${a.agent}: ${a.calls} calls`),
  ].join("\n");

  await sendFormatted(ctx, text);
}

export async function handleMessage(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text;

  if (!chatId || !(await isAllowed(chatId)) || !text) return;

  // Check if user is in config flow
  if (isInConfigFlow(chatId)) {
    await handleConfigStep(ctx);
    return;
  }

  logger.info("Message received", { chatId });

  try {
    // Check if Shopify is configured
    const store = await getActiveStore();
    if (!store) {
      await sendFormatted(
        ctx,
        "Nenhuma loja Shopify conectada.\n\nUse <b>/config nova</b> pra configurar."
      );
      return;
    }

    // Save user message
    await saveMessage(chatId, "user", text);

    // Route to agent
    const agentName = await routeMessage(text, chatId);

    // Dispatch to agent
    const response = await dispatch(agentName, text, chatId);

    // Save assistant response
    await saveMessage(chatId, "assistant", response, agentName);

    // Send formatted response
    await sendFormatted(ctx, response);
  } catch (err) {
    logger.error("Handler error", {
      chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    await ctx.reply("Erro interno. Tente novamente.");
  }
}

async function saveMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string,
  agent?: string
): Promise<void> {
  // Get or create conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("chat_id", chatId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  let convId: number;

  if (!conv) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ chat_id: chatId, agent: agent ?? "unknown" })
      .select("id")
      .single();
    convId = newConv?.id;
  } else {
    convId = conv.id;
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
  }

  await supabase.from("messages").insert({
    conversation_id: convId,
    chat_id: chatId,
    role,
    content,
    agent,
  });
}
