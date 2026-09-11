"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DropdownMenu, AlertDialog } from "radix-ui";
import { MoreVertical, Star, X } from "lucide-react";
import { ClassicSpinner } from "@/components/ui/classic-spinner";
import styles from "./ExistingReviewDialog.module.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  body: string;
  rating: number;
  createdAt?: string;
  avatarUrl?: string | null;
};

export function ExistingReviewDialog({ open, onOpenChange, onEdit, onDelete, body, rating, createdAt, avatarUrl }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [stage, setStage] = useState<"idle" | "deleting" | "complete" | "error">("idle");
  const deleting = useRef(false);
  useEffect(() => {
    if (stage !== "complete") return;
    const timer = window.setTimeout(() => setStage("idle"), 4500);
    return () => window.clearTimeout(timer);
  }, [stage]);

  async function remove() {
    if (deleting.current) return;
    deleting.current = true;
    setConfirm(false);
    onOpenChange(false);
    setStage("deleting");
    try {
      await onDelete();
      setStage("complete");
    } catch {
      setStage("error");
    } finally {
      deleting.current = false;
    }
  }

  const date = createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  return <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <Dialog.Title className={styles.srOnly}>Your review</Dialog.Title>
          <div className={styles.topStrip} />
          <div className={styles.content}>
            <div className={styles.header}>
              <img className={styles.avatar} src={avatarUrl || "/icons/profile.svg"} alt="" />
              <strong>You</strong><span className={styles.date}>Reviewed on {date}</span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger className={styles.more} aria-label="Review options" disabled={stage === "deleting"}><MoreVertical size={20} /></DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className={styles.menu} align="end" sideOffset={8} collisionPadding={16}>
                    <DropdownMenu.Item className={styles.pill} onSelect={onEdit}>Edit</DropdownMenu.Item>
                    <DropdownMenu.Item className={`${styles.pill} ${styles.danger}`} onSelect={() => setConfirm(true)}>Delete</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            <div className={styles.rating} role="img" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: Math.floor(rating) }, (_, i) => <Star key={i} size={28} fill="currentColor" strokeWidth={0} />)}
              {rating % 1 !== 0 ? <span aria-hidden="true">½</span> : null}
            </div>
            <div className={styles.body} tabIndex={0}>{body}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <AlertDialog.Root open={confirm} onOpenChange={setConfirm}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.confirmOverlay} />
        <AlertDialog.Content className={styles.confirm}>
          <AlertDialog.Title>Are you sure you want to delete this review?</AlertDialog.Title>
          <AlertDialog.Description>This action cannot be reversed</AlertDialog.Description>
          <div className={styles.actions}>
            <AlertDialog.Cancel className={styles.pill}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action className={`${styles.pill} ${styles.danger}`} onClick={() => void remove()}>Proceed</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
    {stage !== "idle" ? <div className={styles.toast} role={stage === "error" ? "alert" : "status"} aria-live="polite">
      <span className={styles.statusIcon}>{stage === "deleting" ? <ClassicSpinner theme="dark" /> : stage === "complete" ? <img src="/utilities/Checkmark.png" alt="" /> : <X size={26} />}</span>
      <span>{stage === "deleting" ? "Deleting your review" : stage === "complete" ? "Review has been deleted" : "Could not delete review. Try again."}</span>
      {stage === "error" ? <button className={styles.dismiss} aria-label="Dismiss notification" onClick={() => setStage("idle")}><X size={16} /></button> : null}
    </div> : null}
  </>;
}
