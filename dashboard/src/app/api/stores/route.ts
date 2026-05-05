import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, store_url, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, store_url, access_token } = body;

  if (!name || !store_url || !access_token) {
    return NextResponse.json({ error: "Campos obrigatórios: name, store_url, access_token" }, { status: 400 });
  }

  // Normalize URL
  let url = store_url.trim().toLowerCase();
  if (!url.includes(".myshopify.com")) url = `${url}.myshopify.com`;
  url = url.replace(/^https?:\/\//, "");

  // Deactivate others
  await supabase.from("stores").update({ is_active: false }).eq("is_active", true);

  const { data, error } = await supabase
    .from("stores")
    .upsert(
      { name, store_url: url, access_token, is_active: true, configured_by: 0 },
      { onConflict: "store_url" }
    )
    .select("id, name, store_url, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
