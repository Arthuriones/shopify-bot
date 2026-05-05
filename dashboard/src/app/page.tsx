import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getStats() {
  const [metricsRes, actionsRes, msgsRes] = await Promise.all([
    supabase
      .from("token_metrics")
      .select("tokens_in, tokens_out, duration_ms, agent")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    supabase
      .from("agent_actions")
      .select("id, success")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    supabase
      .from("messages")
      .select("id")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
  ]);

  const metrics = metricsRes.data ?? [];
  const actions = actionsRes.data ?? [];
  const msgs = msgsRes.data ?? [];

  const totalTokensIn = metrics.reduce((s, m) => s + (m.tokens_in ?? 0), 0);
  const totalTokensOut = metrics.reduce((s, m) => s + (m.tokens_out ?? 0), 0);
  const avgLatency = metrics.length
    ? Math.round(
        metrics.reduce((s, m) => s + (m.duration_ms ?? 0), 0) / metrics.length
      )
    : 0;

  const successRate = actions.length
    ? Math.round(
        (actions.filter((a) => a.success).length / actions.length) * 100
      )
    : 100;

  return {
    totalCalls: metrics.length,
    totalTokensIn,
    totalTokensOut,
    avgLatency,
    totalMessages: msgs.length,
    totalActions: actions.length,
    successRate,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Calls LLM (24h)", value: stats.totalCalls },
    { label: "Mensagens (24h)", value: stats.totalMessages },
    { label: "Ações (24h)", value: stats.totalActions },
    { label: "Taxa de sucesso", value: `${stats.successRate}%` },
    {
      label: "Tokens IN",
      value: stats.totalTokensIn.toLocaleString("pt-BR"),
    },
    {
      label: "Tokens OUT",
      value: stats.totalTokensOut.toLocaleString("pt-BR"),
    },
    { label: "Latência média", value: `${stats.avgLatency}ms` },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4"
          >
            <p className="text-xs text-[var(--text-muted)] mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
