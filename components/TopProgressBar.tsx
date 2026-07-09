"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    covaProgressStart?: () => void;
    covaProgressDone?: () => void;
  }
}

export function TopProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const activeCount = useRef(0);
  const finishTimer = useRef<number | null>(null);

  useEffect(() => {
    function start() {
      activeCount.current += 1;
      if (finishTimer.current) {
        window.clearTimeout(finishTimer.current);
      }
      setFinishing(false);
      setActive(true);
    }

    function done() {
      activeCount.current = Math.max(0, activeCount.current - 1);
      if (activeCount.current > 0) {
        return;
      }

      setFinishing(true);
      finishTimer.current = window.setTimeout(() => {
        setActive(false);
        setFinishing(false);
      }, 260);
    }

    const originalFetch = window.fetch.bind(window);

    window.covaProgressStart = start;
    window.covaProgressDone = done;
    window.fetch = async (...args) => {
      start();
      try {
        return await originalFetch(...args);
      } finally {
        done();
      }
    };

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.download || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname + url.search !== window.location.pathname + window.location.search) {
        start();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.fetch = originalFetch;
      window.covaProgressStart = undefined;
      window.covaProgressDone = undefined;
      if (finishTimer.current) {
        window.clearTimeout(finishTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeCount.current > 0) {
      activeCount.current = 1;
      window.covaProgressDone?.();
    }
  }, [pathname]);

  return <div className={`top-progress${active ? " active" : ""}${finishing ? " finishing" : ""}`} aria-hidden />;
}
