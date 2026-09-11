"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ClassicSpinner } from "@/components/ui/classic-spinner";
import type { ActionAlert } from "@/lib/action-alert";
import styles from "./ExistingReviewDialog.module.css";

export function ActionAlerts() {
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  function dismiss(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setAlerts(current => current.filter(alert => alert.id !== id));
  }
  useEffect(() => {
    function receive(event: Event) {
      const alert = (event as CustomEvent<ActionAlert>).detail;
      setAlerts(current => [...current.filter(item => item.id !== alert.id), alert]);
      if (alert.stage !== "loading") {
        timers.current.set(alert.id, setTimeout(() => dismiss(alert.id), alert.stage === "error" ? 8000 : 4500));
      }
    }
    const activeTimers = timers.current;
    window.addEventListener("cova:action-alert", receive);
    return () => {
      window.removeEventListener("cova:action-alert", receive);
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);
  return <div className={styles.toastStack}>
    {alerts.map(alert => <div key={alert.id} className={`${styles.toast} ${styles.stackedToast}`} role={alert.stage === "error" ? "alert" : "status"} aria-atomic="true">
      <span key={alert.stage} className={styles.statusIcon}>
        {alert.stage === "loading" ? <ClassicSpinner theme="dark" /> : alert.stage === "success" ? <img src="/utilities/Checkmark.png" alt="" /> : <X size={26} />}
      </span>
      <span>{alert.message}</span>
      {alert.stage !== "loading" ? <button className={styles.dismiss} aria-label="Dismiss notification" onClick={() => dismiss(alert.id)}><X size={16} /></button> : null}
    </div>)}
  </div>;
}
