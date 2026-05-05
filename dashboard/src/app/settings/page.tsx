"use client";

import { useState, useEffect } from "react";

interface Store {
  id: number;
  name: string;
  store_url: string;
  is_active: boolean;
}

interface TelegramCfg {
  id: number;
  bot_name: string;
  allowed_chat_ids: number[];
  is_active: boolean;
}

export default function SettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [telegramCfg, setTelegramCfg] = useState<TelegramCfg | null>(null);
  const [loading, setLoading] = useState(true);

  // Shopify form
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "",
    store_url: "",
    access_token: "",
  });
  const [savingStore, setSavingStore] = useState(false);

  // Telegram form
  const [showTgForm, setShowTgForm] = useState(false);
  const [tgForm, setTgForm] = useState({
    bot_token: "",
    bot_name: "",
    allowed_chat_ids: "",
  });
  const [savingTg, setSavingTg] = useState(false);
  const [tgError, setTgError] = useState("");

  useEffect(() => {
    Promise.all([fetchStores(), fetchTelegram()]).then(() => setLoading(false));
  }, []);

  async function fetchStores() {
    const res = await fetch("/api/stores");
    const data = await res.json();
    setStores(Array.isArray(data) ? data : []);
  }

  async function fetchTelegram() {
    const res = await fetch("/api/telegram");
    const data = await res.json();
    setTelegramCfg(data);
  }

  async function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingStore(true);
    await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storeForm),
    });
    setStoreForm({ name: "", store_url: "", access_token: "" });
    setShowStoreForm(false);
    setSavingStore(false);
    fetchStores();
  }

  async function handleTgSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingTg(true);
    setTgError("");

    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tgForm),
    });

    const data = await res.json();
    setSavingTg(false);

    if (!res.ok) {
      setTgError(data.error ?? "Erro desconhecido");
      return;
    }

    setTgForm({ bot_token: "", bot_name: "", allowed_chat_ids: "" });
    setShowTgForm(false);
    fetchTelegram();
  }

  async function handleDeleteStore(id: number) {
    if (!confirm("Remover esta loja?")) return;
    await fetch(`/api/stores?id=${id}`, { method: "DELETE" });
    fetchStores();
  }

  if (loading) {
    return <p className="text-[var(--text-muted)]">Carregando...</p>;
  }

  return (
    <div className="space-y-10">
      {/* TELEGRAM SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Telegram Bot</h2>
          <button
            onClick={() => setShowTgForm(!showTgForm)}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm hover:opacity-90"
          >
            {showTgForm ? "Cancelar" : telegramCfg ? "Reconfigurar" : "Conectar bot"}
          </button>
        </div>

        {telegramCfg ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
              <span className="font-medium">
                {telegramCfg.bot_name || "Bot configurado"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)]">
                ativo
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Chat IDs permitidos:{" "}
              {telegramCfg.allowed_chat_ids.length > 0
                ? telegramCfg.allowed_chat_ids.join(", ")
                : "todos (sem restrição)"}
            </p>
          </div>
        ) : (
          <p className="text-[var(--text-muted)]">
            Nenhum bot conectado. Clique em &quot;Conectar bot&quot; e cole o token do @BotFather.
          </p>
        )}

        {showTgForm && (
          <form
            onSubmit={handleTgSubmit}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                Bot Token (do @BotFather)
              </label>
              <input
                type="password"
                value={tgForm.bot_token}
                onChange={(e) =>
                  setTgForm({ ...tgForm, bot_token: e.target.value })
                }
                placeholder="123456789:ABCdefGHI..."
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                Nome do bot (opcional)
              </label>
              <input
                type="text"
                value={tgForm.bot_name}
                onChange={(e) =>
                  setTgForm({ ...tgForm, bot_name: e.target.value })
                }
                placeholder="Meu Shopify Bot"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                Chat IDs permitidos (separados por vírgula, vazio = todos)
              </label>
              <input
                type="text"
                value={tgForm.allowed_chat_ids}
                onChange={(e) =>
                  setTgForm({ ...tgForm, allowed_chat_ids: e.target.value })
                }
                placeholder="123456789, 987654321"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Descubra seu chat_id mandando mensagem pro @userinfobot no Telegram
              </p>
            </div>

            {tgError && (
              <p className="text-sm text-[var(--red)]">{tgError}</p>
            )}

            <button
              type="submit"
              disabled={savingTg}
              className="px-4 py-2 bg-[var(--green)] text-black rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingTg ? "Validando token..." : "Conectar"}
            </button>
          </form>
        )}
      </section>

      {/* SHOPIFY SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Lojas Shopify</h2>
          <button
            onClick={() => setShowStoreForm(!showStoreForm)}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm hover:opacity-90"
          >
            {showStoreForm ? "Cancelar" : "Conectar loja"}
          </button>
        </div>

        {showStoreForm && (
          <form
            onSubmit={handleStoreSubmit}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 mb-4 space-y-4"
          >
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                Nome da loja
              </label>
              <input
                type="text"
                value={storeForm.name}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, name: e.target.value })
                }
                placeholder="Minha Loja"
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                URL da Shopify
              </label>
              <input
                type="text"
                value={storeForm.store_url}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, store_url: e.target.value })
                }
                placeholder="minha-loja.myshopify.com"
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={storeForm.access_token}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, access_token: e.target.value })
                }
                placeholder="shpat_..."
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Shopify Admin → Settings → Apps → Develop apps → Create app → API credentials
              </p>
            </div>
            <button
              type="submit"
              disabled={savingStore}
              className="px-4 py-2 bg-[var(--green)] text-black rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingStore ? "Salvando..." : "Conectar"}
            </button>
          </form>
        )}

        {stores.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            Nenhuma loja conectada. Conecte via dashboard ou{" "}
            <code>/config nova</code> no Telegram.
          </p>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        store.is_active
                          ? "bg-[var(--green)]"
                          : "bg-[var(--text-muted)]"
                      }`}
                    />
                    <span className="font-medium">{store.name}</span>
                    {store.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)]">
                        ativa
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {store.store_url}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteStore(store.id)}
                  className="text-sm text-[var(--red)] hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
