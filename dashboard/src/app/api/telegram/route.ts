import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("telegram_config")
    .select("id, bot_name, allowed_chat_ids, is_active, created_at")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { bot_token, bot_name, allowed_chat_ids } = body;

  if (!bot_token) {
    return NextResponse.json(
      { error: "bot_token é obrigatório" },
      { status: 400 }
    );
  }

  // Validate token with Telegram API
  try {
    const res = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { error: "Token inválido. Verifique com o @BotFather." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Não consegui validar o token." },
      { status: 500 }
    );
  }

  // Deactivate previous configs
  await supabase
    .from("telegram_config")
    .update({ is_active: false })
    .eq("is_active", true);

  // Parse chat IDs
  const chatIds = (allowed_chat_ids ?? "")
    .split(",")
    .map((s: string) => Number(s.trim()))
    .filter((n: number) => !isNaN(n) && n > 0);

  const { data, error } = await supabase
    .from("telegram_config")
    .insert({
      bot_token,
      bot_name: bot_name ?? "",
      allowed_chat_ids: chatIds,
      is_active: true,
    })
    .select("id, bot_name, allowed_chat_ids, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
