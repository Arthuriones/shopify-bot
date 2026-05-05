import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getConversations() {
  const { data } = await supabase
    .from("messages")
    .select("id, chat_id, role, content, agent, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export default async function ConversationsPage() {
  const messages = await getConversations();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Conversas</h2>

      <div className="space-y-2">
        {messages.length === 0 && (
          <p className="text-[var(--text-muted)]">Nenhuma conversa ainda.</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 ${
              msg.role === "user" ? "border-l-4 border-l-[var(--accent)]" : "border-l-4 border-l-[var(--green)]"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)]">
              <span className="font-bold uppercase">
                {msg.role === "user" ? "Você" : msg.agent ?? "bot"}
              </span>
              <span>
                {new Date(msg.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {msg.content.length > 500
                ? msg.content.slice(0, 500) + "..."
                : msg.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
