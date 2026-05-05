import { supabase } from "../db/client.js";

interface TokenUsage {
  correlationId: string;
  chatId: number;
  agent: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

export async function recordTokenUsage(usage: TokenUsage): Promise<void> {
  await supabase.from("token_metrics").insert({
    correlation_id: usage.correlationId,
    chat_id: usage.chatId,
    agent: usage.agent,
    model: usage.model,
    tokens_in: usage.tokensIn,
    tokens_out: usage.tokensOut,
    duration_ms: usage.durationMs,
  });
}

export async function getMetrics24h(): Promise<{
  totalCalls: number;
  tokensIn: number;
  tokensOut: number;
  avgDurationMs: number;
  topAgents: Array<{ agent: string; calls: number }>;
}> {
  const since = new Date(Date.now() - 86400000).toISOString();

  const { data: metrics } = await supabase
    .from("token_metrics")
    .select("tokens_in, tokens_out, duration_ms, agent")
    .gte("created_at", since);

  const rows = metrics ?? [];
  const totalCalls = rows.length;
  const tokensIn = rows.reduce((s, m) => s + (m.tokens_in ?? 0), 0);
  const tokensOut = rows.reduce((s, m) => s + (m.tokens_out ?? 0), 0);
  const avgDurationMs = totalCalls
    ? Math.round(rows.reduce((s, m) => s + (m.duration_ms ?? 0), 0) / totalCalls)
    : 0;

  // Top agents
  const agentCounts: Record<string, number> = {};
  for (const r of rows) {
    agentCounts[r.agent] = (agentCounts[r.agent] ?? 0) + 1;
  }
  const topAgents = Object.entries(agentCounts)
    .map(([agent, calls]) => ({ agent, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 5);

  return { totalCalls, tokensIn, tokensOut, avgDurationMs, topAgents };
}
