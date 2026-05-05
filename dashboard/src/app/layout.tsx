import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify Bot — Dashboard",
  description: "Painel de controle do gateway multi-agente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const links = [
    { href: "/", label: "Dashboard", icon: "grid" },
    { href: "/agents", label: "Agentes", icon: "bot" },
    { href: "/conversations", label: "Conversas", icon: "message-square" },
    { href: "/metrics", label: "Métricas", icon: "bar-chart" },
    { href: "/settings", label: "Configurações", icon: "settings" },
  ];

  return (
    <aside className="w-56 min-h-screen border-r border-[var(--border)] p-4 flex flex-col gap-1">
      <h1 className="text-lg font-bold mb-6 px-3">Shopify Bot</h1>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--card)] transition-colors"
        >
          {link.label}
        </a>
      ))}
    </aside>
  );
}
