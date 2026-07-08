import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_DISPLAY_NAME_LENGTH = 16;
const MAX_AVATAR_DATA_URL_LENGTH = 450_000;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before updating your profile." }, { status: 401 });
  }

  const body = (await request.json()) as { displayName?: string; avatarUrl?: string | null };
  const displayName = body.displayName?.trim() ?? "";
  const avatarUrl = body.avatarUrl?.trim() || null;

  if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return NextResponse.json({ error: "Profile name should be 1-16 characters." }, { status: 400 });
  }

  if (avatarUrl && (!avatarUrl.startsWith("data:image/") || avatarUrl.length > MAX_AVATAR_DATA_URL_LENGTH)) {
    return NextResponse.json({ error: "Profile picture could not be saved. Try a smaller image." }, { status: 400 });
  }

  const update: { display_name: string; avatar_url?: string | null } = {
    display_name: displayName
  };

  if (avatarUrl) {
    update.avatar_url = avatarUrl;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
