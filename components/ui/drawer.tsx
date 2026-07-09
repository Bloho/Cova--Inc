"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function Drawer({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return <>{children}</>;
}

export function DrawerContent({
  children,
  className = "",
  onOpenChange
}: {
  children: ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className="drawer-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <aside className={`drawer-content ${className}`.trim()} role="dialog" aria-modal="true">
        {children}
      </aside>
    </div>
  );
}

export function DrawerHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`drawer-header ${className}`.trim()}>{children}</div>;
}

export function DrawerTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`drawer-title ${className}`.trim()}>{children}</h2>;
}
