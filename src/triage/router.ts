import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callHaiku } from "../llm/claude.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routingPath = path.resolve(__dirname, "../../config/routing.json");

interface RoutingConfig {
  agents: Record<string, string>;
  default: string;
}

function loadRouting(): RoutingConfig {
  const raw = fs.readFileSync(routingPath, "utf-8");
  return JSON.parse(raw) as RoutingConfig;
}

const ROUTER_SYSTEM = `Você é um roteador de mensagens. Sua ÚNICA função é decidir qual agente deve atender a mensagem.

Responda APENAS com o nome do agente, sem explicação, sem pontuação, sem nada mais.

Agentes disponíveis:
{{AGENTS}}

Se não souber, responda: {{DEFAULT}}`;

export async function routeMessage(
  userMessage: string,
  chatId: number
): Promise<string> {
  const config = loadRouting();
  const agentList = Object.entries(config.agents)
    .map(([name, desc]) => `- ${name}: ${desc}`)
    .join("\n");

  const system = ROUTER_SYSTEM.replace("{{AGENTS}}", agentList).replace(
    "{{DEFAULT}}",
    config.default
  );

  try {
    const response = await callHaiku(system, userMessage, chatId, "router");
    const agent = response.trim().toLowerCase();

    // Validate it's a known agent
    if (agent in config.agents) {
      logger.info("Routed message", { chatId, agent });
      return agent;
    }

    logger.warn("Router returned unknown agent", { chatId, agent });
    return config.default;
  } catch (err) {
    logger.error("Router failed, using default", {
      chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    return config.default;
  }
}
