import { DeletionSequencePreview } from "@/components/DeletionSequencePreview";
import { ProfilePageSkeleton } from "@/components/PageSkeletons";
import { requireDevelopmentPreview } from "@/lib/development-preview";

export default function DeletionSequencePreviewPage() {
  requireDevelopmentPreview();

  return (
    <>
      <ProfilePageSkeleton />
      <DeletionSequencePreview />
    </>
  );
}
