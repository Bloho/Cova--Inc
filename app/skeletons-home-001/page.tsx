import { HomePageSkeleton } from "@/components/PageSkeletons";
import { requireDevelopmentPreview } from "@/lib/development-preview";

export default function HomeSkeletonPreviewPage() {
  requireDevelopmentPreview();
  return <HomePageSkeleton />;
}
