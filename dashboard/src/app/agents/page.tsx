import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getAgentStats() {
  const { data } = await supabase
    .from("token_metrics")
    .select("agent, tokens_in, tokens_out, duration_ms")
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

  const agents: Record<
    string,
    { calls: number; tokensIn: number; tokensOut: number; avgMs: number }
  > = {};

  for (const row of data ?? []) {
    const a = row.agent;
    if (!agents[a])
      agents[a] = { calls: 0, tokensIn: 0, tokensOut: 0, avgMs: 0 };
    agents[a].calls++;
    agents[a].tokensIn += row.tokens_in ?? 0;
    agents[a].tokensOut += row.tokens_out ?? 0;
    agents[a].avgMs += row.duration_ms ?? 0;
  }

  return Object.entries(agents).map(([name, stats]) => ({
    name,
    ...stats,
    avgMs: stats.calls ? Math.round(stats.avgMs / stats.calls) : 0,
  }));
}

export default async function AgentsPage() {
  const agents = await getAgentStats();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Agentes</h2>

      <div className="grid gap-4">
        {agents.length === 0 && (
          <p className="text-[var(--text-muted)]">
            Nenhum agente registrado ainda. Mande uma mensagem no Telegram.
          </p>
        )}

        {agents.map((agent) => (
          <div
            key={agent.name}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold capitalize">
                {agent.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--green)]/10 text-[var(--green)]">
                ativo
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Calls (7d)</p>
                <p className="font-bold">{agent.calls}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Tokens IN</p>
                <p className="font-bold">
                  {agent.tokensIn.toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Tokens OUT</p>
                <p className="font-bold">
                  {agent.tokensOut.toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Latência</p>
                <p className="font-bold">{agent.avgMs}ms</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
