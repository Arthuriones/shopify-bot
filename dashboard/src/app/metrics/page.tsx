import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getMetricsData() {
  const { data } = await supabase
    .from("token_metrics")
    .select("agent, model, tokens_in, tokens_out, duration_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return data ?? [];
}

async function getActionLog() {
  const { data } = await supabase
    .from("agent_actions")
    .select("agent, action, success, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return data ?? [];
}

export default async function MetricsPage() {
  const [metrics, actions] = await Promise.all([
    getMetricsData(),
    getActionLog(),
  ]);

  const totalCost = metrics.reduce((sum, m) => {
    // Haiku: $0.25/M in, $1.25/M out | Sonnet: $3/M in, $15/M out
    const isHaiku = m.model?.includes("haiku");
    const inCost = isHaiku ? 0.00000025 : 0.000003;
    const outCost = isHaiku ? 0.00000125 : 0.000015;
    return sum + m.tokens_in * inCost + m.tokens_out * outCost;
  }, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Métricas</h2>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <p className="text-sm text-[var(--text-muted)] mb-1">
          Custo estimado (últimas 100 calls)
        </p>
        <p className="text-3xl font-bold">
          ${totalCost.toFixed(4)} USD
        </p>
      </div>

      <h3 className="text-lg font-bold mb-3">Últimas calls LLM</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="pb-2">Agente</th>
              <th className="pb-2">Modelo</th>
              <th className="pb-2">IN</th>
              <th className="pb-2">OUT</th>
              <th className="pb-2">ms</th>
              <th className="pb-2">Quando</th>
            </tr>
          </thead>
          <tbody>
            {metrics.slice(0, 20).map((m, i) => (
              <tr key={i} className="border-b border-[var(--border)]/50">
                <td className="py-2 capitalize">{m.agent}</td>
                <td className="py-2 text-[var(--text-muted)]">
                  {m.model?.includes("haiku") ? "Haiku" : "Sonnet"}
                </td>
                <td className="py-2">{m.tokens_in}</td>
                <td className="py-2">{m.tokens_out}</td>
                <td className="py-2">{m.duration_ms}</td>
                <td className="py-2 text-[var(--text-muted)]">
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-bold mb-3">Últimas ações</h3>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm bg-[var(--card)] border border-[var(--border)] rounded-md px-4 py-2"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                a.success ? "bg-[var(--green)]" : "bg-[var(--red)]"
              }`}
            />
            <span className="capitalize font-medium">{a.agent}</span>
            <span className="text-[var(--text-muted)]">{a.action}</span>
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              {new Date(a.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
