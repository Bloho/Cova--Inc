import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null) as { country?: string } | null;
  const country = body?.country?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: "Choose a valid billing country." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update({ billing_country: country }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Your billing country could not be saved." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
