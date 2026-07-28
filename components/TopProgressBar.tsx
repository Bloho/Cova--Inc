"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

declare global {
  interface Window {
    covaProgressStart?: () => void;
    covaProgressRouteStart?: () => void;
    covaProgressDone?: () => void;
  }
}

export function TopProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingRoute = useRef(false);
  const finishTimer = useRef<number | null>(null);
  const startFrame = useRef<number | null>(null);
  const requestTimer = useRef<number | null>(null);
  const pendingRequests = useRef(0);
  const isVisible = useRef(false);

  useEffect(() => {
    function start() {
      if (finishTimer.current) {
        window.clearTimeout(finishTimer.current);
      }
      if (startFrame.current) {
        window.cancelAnimationFrame(startFrame.current);
      }
      setFinishing(false);
      setActive(true);
      isVisible.current = true;
      setProgress(0.08);
      startFrame.current = window.requestAnimationFrame(() => {
        setProgress(0.87);
      });
    }

    function routeStart() {
      pendingRoute.current = true;
      start();
    }

    function done() {
      if (startFrame.current) {
        window.cancelAnimationFrame(startFrame.current);
      }
      setProgress(1);
      setFinishing(true);
      finishTimer.current = window.setTimeout(() => {
        setActive(false);
        setFinishing(false);
        setProgress(0);
        isVisible.current = false;
      }, 260);
    }

    window.covaProgressStart = start;
    window.covaProgressRouteStart = routeStart;
    window.covaProgressDone = done;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      pendingRequests.current += 1;

      if (!pendingRoute.current && !isVisible.current && !requestTimer.current) {
        requestTimer.current = window.setTimeout(() => {
          requestTimer.current = null;
          if (pendingRequests.current && !pendingRoute.current) {
            start();
          }
        }, 140);
      }

      try {
        return await originalFetch(...args);
      } finally {
        pendingRequests.current = Math.max(0, pendingRequests.current - 1);
        if (!pendingRequests.current && !pendingRoute.current) {
          if (requestTimer.current) {
            window.clearTimeout(requestTimer.current);
            requestTimer.current = null;
          }
          if (isVisible.current) {
            done();
          }
        }
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
        routeStart();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.fetch = originalFetch;
      window.covaProgressStart = undefined;
      window.covaProgressRouteStart = undefined;
      window.covaProgressDone = undefined;
      if (finishTimer.current) {
        window.clearTimeout(finishTimer.current);
      }
      if (startFrame.current) {
        window.cancelAnimationFrame(startFrame.current);
      }
      if (requestTimer.current) {
        window.clearTimeout(requestTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingRoute.current) {
      pendingRoute.current = false;
      // The new route has committed; let React paint it before completing the bar.
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.covaProgressDone?.());
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [pathname]);

  return (
    <div
      className={`top-progress${active ? " active" : ""}${finishing ? " finishing" : ""}`}
      style={{ "--progress": progress } as CSSProperties}
      aria-hidden
    />
  );
}
