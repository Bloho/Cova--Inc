import { ProfilePageSkeleton } from "@/components/PageSkeletons";
import { requireDevelopmentPreview } from "@/lib/development-preview";

export default function ProfileSkeletonPreviewPage() {
  requireDevelopmentPreview();
  return <ProfilePageSkeleton />;
}
