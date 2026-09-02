import ProfilePage from "@/app/[username]/page";
import { requireDevelopmentPreview } from "@/lib/development-preview";
import { getCurrentUserProfile } from "@/lib/library";

export default async function ProfilePagePreview() {
  requireDevelopmentPreview();
  const { profile } = await getCurrentUserProfile();

  return <ProfilePage params={Promise.resolve({ username: profile?.username ?? "ayush" })} searchParams={Promise.resolve({})} />;
}
