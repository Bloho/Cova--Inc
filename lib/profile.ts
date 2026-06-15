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

  const displayName = user.user_metadata?.full_name ?? user.email ?? "Cova user";

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username: null,
    display_name: displayName,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    onboarded_at: null
  });

  return { error };
}
