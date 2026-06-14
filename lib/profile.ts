import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return { error: existingError };
  }

  if (existing) {
    return { error: null };
  }

  const emailName = user.email?.split("@")[0] ?? "user";
  const clean = emailName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18) || "user";
  const username = `${clean}${user.id.slice(0, 6)}`.toLowerCase();
  const displayName = user.user_metadata?.full_name ?? user.email ?? "Cova user";

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: displayName,
    avatar_url: user.user_metadata?.avatar_url ?? null
  });

  return { error };
}
