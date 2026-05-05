import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.resolve(__dirname, "../../agents");

const promptCache = new Map<string, { content: string; mtime: number }>();

export function loadAgentPrompt(agentName: string): string {
  const agentDir = path.join(agentsDir, agentName);
  const systemFile = path.join(agentDir, "system.md");

  if (!fs.existsSync(systemFile)) {
    logger.warn("Agent system.md not found", { agentName });
    return `You are the ${agentName} agent. Respond helpfully.`;
  }

  const stat = fs.statSync(systemFile);
  const mtime = stat.mtimeMs;
  const cached = promptCache.get(agentName);

  if (cached && cached.mtime === mtime) {
    return cached.content;
  }

  const content = fs.readFileSync(systemFile, "utf-8");
  promptCache.set(agentName, { content, mtime });

  logger.debug("Agent prompt loaded", { agentName });
  return content;
}

export function listAgents(): string[] {
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
