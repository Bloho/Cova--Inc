"use client";

import { useEffect, useRef, useState } from "react";

type DeletionStage = "confirm" | "irreversible" | "deleting" | "complete";

type ReviewDeletionSequenceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
};

export function ReviewDeletionSequence({ open, onOpenChange, onDelete }: ReviewDeletionSequenceProps) {
  const [stage, setStage] = useState<DeletionStage>("confirm");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current && stage !== "deleting") {
      setStage("confirm");
      setAcknowledged(false);
      setError("");
    }
    wasOpen.current = open;
  }, [open, stage]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (stage !== "complete") return;

    const timeout = window.setTimeout(() => onOpenChange(false), 900);
    return () => window.clearTimeout(timeout);
  }, [stage, onOpenChange]);

  async function deleteReview() {
    setStage("deleting");
    setError("");

    try {
      await onDelete();
      setStage("complete");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete this review.");
      setStage("irreversible");
    }
  }

  function dismissFromBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="deletion-sequence-backdrop"
      role="presentation"
      onClick={dismissFromBackdrop}
      onMouseDown={dismissFromBackdrop}
    >
      <section className="deletion-sequence-dialog" aria-labelledby="deletion-sequence-title" aria-modal="true" role="dialog">
        <div className="deletion-sequence-stage" key={stage}>
          {stage === "confirm" ? (
            <>
              <video autoPlay className="deletion-sequence-trash" loop muted playsInline preload="metadata" aria-hidden>
                <source src="/assets/trash.webm" type="video/webm" />
              </video>
              <h2 id="deletion-sequence-title">Are you sure you want to delete your review?</h2>
              <div className="deletion-sequence-actions split">
                <button className="deletion-sequence-secondary" onClick={() => onOpenChange(false)} type="button">Nevermind</button>
                <button className="deletion-sequence-danger" onClick={() => setStage("irreversible")} type="button">Yes, delete</button>
              </div>
            </>
          ) : null}

          {stage === "irreversible" ? (
            <>
              <h2 id="deletion-sequence-title">This action cannot be undone.</h2>
              <label className="deletion-sequence-check">
                <input checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" />
                <span>I understand that this cannot be undone</span>
              </label>
              {error ? <p className="deletion-sequence-error">{error}</p> : null}
              <div className="deletion-sequence-actions stacked">
                <button className="deletion-sequence-danger" disabled={!acknowledged} onClick={() => void deleteReview()} type="button">Yes, delete</button>
                <button className="deletion-sequence-text-button" onClick={() => onOpenChange(false)} type="button">Cancel</button>
              </div>
            </>
          ) : null}

          {stage === "deleting" ? <h2 id="deletion-sequence-title">Deleting your review</h2> : null}
          {stage === "complete" ? <h2 id="deletion-sequence-title">Deletion completed.</h2> : null}
        </div>
      </section>
    </div>
  );
}
