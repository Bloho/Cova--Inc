import { ProfileDashboardSkeleton } from "@/components/ProfileDashboardSkeleton";
import { requireDevelopmentPreview } from "@/lib/development-preview";

export default function ProfilePageSkeletonPreview() {
  requireDevelopmentPreview();
  return <ProfileDashboardSkeleton />;
}
