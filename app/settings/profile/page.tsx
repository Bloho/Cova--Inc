import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileSettings } from "@/components/ProfileSettings";
import styles from "@/components/ProfileSettings.module.css";

export default async function ProfileSettingsPage() {
  const { user, profile } = await getCurrentUserProfile();
  if (!user) redirect("/login?next=/settings/profile");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("banner_url").eq("id", user.id).maybeSingle();
  return <main className={styles.page}>
    <header className={styles.header}><Link href={profile?.username ? `/${profile.username}` : "/"} aria-label="Back to profile"><ArrowLeft size={24} /></Link><h1>Profile settings</h1></header>
    <ProfileSettings displayName={profile?.display_name ?? ""} username={profile?.username ?? ""} avatarUrl={profile?.avatar_url ?? null} bannerUrl={data?.banner_url ?? null} />
  </main>;
}
