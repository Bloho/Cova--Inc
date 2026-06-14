import { HeaderClient } from "@/components/HeaderClient";
import { getCurrentUserProfile } from "@/lib/library";

export async function Header() {
  const { user, profile } = await getCurrentUserProfile();

  return (
    <HeaderClient
      isSignedIn={Boolean(user)}
      username={profile?.username ?? null}
      displayName={profile?.display_name ?? user?.email ?? null}
    />
  );
}
