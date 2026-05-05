import { callSonnet } from "../llm/claude.js";
import { loadAgentPrompt } from "./loader.js";
import { supabase } from "../db/client.js";
import { logger } from "../utils/logger.js";
import * as products from "../shopify/products.js";
import * as theme from "../shopify/theme.js";

interface AgentAction {
  action: string;
  params: Record<string, unknown>;
  message?: string;
}

export async function dispatch(
  agentName: string,
  userMessage: string,
  chatId: number
): Promise<string> {
  const systemPrompt = loadAgentPrompt(agentName);

  // Get recent conversation context
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(10);

  const context = (history ?? [])
    .reverse()
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const fullMessage = context
    ? `Histórico recente:\n${context}\n\nMensagem atual: ${userMessage}`
    : userMessage;

  // Ask Claude to interpret the command
  const response = await callSonnet(
    systemPrompt,
    fullMessage,
    chatId,
    agentName
  );

  // Try to parse as action JSON
  try {
    const parsed = extractJson(response);
    if (parsed) {
      return await executeAction(agentName, parsed, chatId);
    }
  } catch {
    // If not valid JSON, return raw response
  }

  return response;
}

function extractJson(text: string): AgentAction | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AgentAction;
    if (parsed.action) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function executeAction(
  agentName: string,
  action: AgentAction,
  chatId: number
): Promise<string> {
  const { action: act, params } = action;

  logger.info("Executing action", { agentName, action: act, chatId });

  await supabase.from("agent_actions").insert({
    chat_id: chatId,
    agent: agentName,
    action: act,
    params,
  });

  try {
    let result: string;

    if (agentName === "produtos") {
      result = await executeProductAction(act, params);
    } else if (agentName === "theme") {
      result = await executeThemeAction(act, params);
    } else {
      result = action.message ?? "Agente não reconhecido.";
    }

    await supabase
      .from("agent_actions")
      .update({ result: { text: result }, success: true })
      .eq("chat_id", chatId)
      .eq("agent", agentName)
      .eq("action", act)
      .order("created_at", { ascending: false })
      .limit(1);

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase
      .from("agent_actions")
      .update({ result: { error: errorMsg }, success: false })
      .eq("chat_id", chatId)
      .eq("agent", agentName)
      .eq("action", act)
      .order("created_at", { ascending: false })
      .limit(1);

    return `Erro ao executar: ${errorMsg}`;
  }
}

async function executeProductAction(
  action: string,
  params: Record<string, unknown>
): Promise<string> {
  switch (action) {
    case "create":
      return products.createProduct({
        title: String(params.title ?? ""),
        price: String(params.price ?? "0"),
        quantity: Number(params.quantity ?? 0),
        description: params.description ? String(params.description) : undefined,
        vendor: params.vendor ? String(params.vendor) : undefined,
        productType: params.product_type ? String(params.product_type) : undefined,
      });
    case "list":
      return products.listProducts(Number(params.limit ?? 10));
    case "search":
      return products.searchProducts(String(params.query ?? ""));
    case "get":
      return products.getProduct(Number(params.product_id));
    case "update":
      return products.updateProduct(Number(params.product_id), {
        title: params.title ? String(params.title) : undefined,
        price: params.price ? String(params.price) : undefined,
        description: params.description ? String(params.description) : undefined,
        status: params.status as "active" | "draft" | "archived" | undefined,
      });
    case "delete":
      return products.deleteProduct(Number(params.product_id));
    case "clarify":
      return String(params.message ?? "Não entendi o comando. Pode repetir?");
    default:
      return `Ação "${action}" não reconhecida para produtos.`;
  }
}

async function executeThemeAction(
  action: string,
  params: Record<string, unknown>
): Promise<string> {
  switch (action) {
    case "list_themes":
      return theme.listThemes();
    case "list_assets":
      return theme.listAssets();
    case "read":
      return theme.readAsset(String(params.asset_key ?? ""));
    case "update":
      return theme.updateAsset(String(params.asset_key ?? ""), String(params.content ?? ""));
    case "find_replace":
      return theme.findAndReplace(
        String(params.asset_key ?? ""),
        String(params.search ?? ""),
        String(params.replace ?? "")
      );
    case "clarify":
      return String(params.message ?? "Não entendi. Especifique o arquivo e a alteração.");
    default:
      return `Ação "${action}" não reconhecida para theme.`;
  }
}
