"use client";

import { cloneElement, createContext, useContext, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function close(event: MouseEvent) {
      if (triggerRef.current?.parentElement?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="dropdown-menu-root">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  render
}: {
  render: ReactElement<{ onClick?: () => void; "aria-expanded"?: boolean; "aria-haspopup"?: "menu" }>;
}) {
  const context = useDropdownContext();
  return (
    <div ref={context.triggerRef}>
      {cloneElement(render, {
        onClick: () => context.setOpen(!context.open),
        "aria-expanded": context.open,
        "aria-haspopup": "menu"
      })}
    </div>
  );
}

export function DropdownMenuContent({
  className = "",
  align = "start",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }) {
  const context = useDropdownContext();

  if (!context.open) {
    return null;
  }

  return (
    <div className={`dropdown-menu-content dropdown-menu-align-${align} ${className}`.trim()} role="menu" {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuGroup({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`dropdown-menu-group ${className}`.trim()} {...props} />;
}

export function DropdownMenuItem({
  className = "",
  onSelect,
  children,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { onSelect?: () => void }) {
  const context = useDropdownContext();

  return (
    <button
      className={`dropdown-menu-item ${className}`.trim()}
      role="menuitem"
      type="button"
      onClick={() => {
        onSelect?.();
        context.setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`dropdown-menu-separator ${className}`.trim()} role="separator" {...props} />;
}

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used inside DropdownMenu.");
  }
  return context;
}
