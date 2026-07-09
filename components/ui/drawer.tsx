"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const DrawerClosingContext = createContext(false);

export function Drawer({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timeout = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 280);
      return () => window.clearTimeout(timeout);
    }
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || closing) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closing, mounted, onOpenChange]);

  if (!mounted) {
    return null;
  }

  return <DrawerClosingContext.Provider value={closing}>{children}</DrawerClosingContext.Provider>;
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
  const closing = useContext(DrawerClosingContext);

  return (
    <div
      className={`drawer-overlay${closing ? " closing" : ""}`}
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
