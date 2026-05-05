import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";
import { recordTokenUsage } from "./tokens.js";
import { newCorrelationId } from "../utils/correlation.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface LlmRequest {
  systemPrompt: string;
  userMessage: string;
  chatId: number;
  agent: string;
  model?: "claude-haiku-4-5-20251001" | "claude-sonnet-4-6-20250514";
  maxTokens?: number;
}

export async function callClaude(req: LlmRequest): Promise<string> {
  const model = req.model ?? "claude-haiku-4-5-20251001";
  const correlationId = newCorrelationId();
  const start = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 2048,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userMessage }],
    });

    const duration = Date.now() - start;
    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    await recordTokenUsage({
      correlationId,
      chatId: req.chatId,
      agent: req.agent,
      model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      durationMs: duration,
    });

    logger.info("LLM call", {
      correlationId,
      agent: req.agent,
      model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      durationMs: duration,
    });

    return text;
  } catch (err) {
    logger.error("LLM call failed", {
      correlationId,
      agent: req.agent,
      model,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function callHaiku(
  systemPrompt: string,
  userMessage: string,
  chatId: number,
  agent: string
): Promise<string> {
  return callClaude({
    systemPrompt,
    userMessage,
    chatId,
    agent,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 1024,
  });
}

export async function callSonnet(
  systemPrompt: string,
  userMessage: string,
  chatId: number,
  agent: string
): Promise<string> {
  return callClaude({
    systemPrompt,
    userMessage,
    chatId,
    agent,
    model: "claude-sonnet-4-6-20250514",
    maxTokens: 4096,
  });
}
