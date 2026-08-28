import { MoviePageSkeleton } from "@/components/PageSkeletons";
import { requireDevelopmentPreview } from "@/lib/development-preview";

export default function MovieSkeletonPreviewPage() {
  requireDevelopmentPreview();
  return <MoviePageSkeleton />;
}
