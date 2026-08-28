"use client";

import { useState } from "react";
import { ReviewDeletionSequence } from "@/components/ReviewDeletionSequence";

export function DeletionSequencePreview() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <ReviewDeletionSequence
        open={open}
        onOpenChange={setOpen}
        onDelete={() => new Promise((resolve) => window.setTimeout(resolve, 1200))}
      />
      {!open ? (
        <button className="deletion-preview-restart" onClick={() => setOpen(true)} type="button">Restart deletion sequence</button>
      ) : null}
    </>
  );
}
