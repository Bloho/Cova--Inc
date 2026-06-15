"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const USERNAME_RE = /^[a-z0-9-]{3,10}$/;

export function OnboardingModal({ initialUsername = "" }: { initialUsername?: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(normalizeUsername(initialUsername ?? ""));
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState("Username should be between 3-10 characters");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const isValid = useMemo(() => USERNAME_RE.test(username), [username]);

  useEffect(() => {
    if (!username) {
      setStatus("idle");
      setMessage("Username should be between 3-10 characters");
      return;
    }

    if (!isValid) {
      setStatus("invalid");
      setMessage("Use 3-10 letters, numbers, and dashes");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("checking");
      const response = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`, {
        signal: controller.signal
      }).catch(() => null);

      if (!response) {
        return;
      }

      const data = (await response.json()) as { available: boolean; message: string };
      setStatus(data.available ? "available" : "taken");
      setMessage(data.message);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isValid, username]);

  async function save() {
    if (status !== "available") {
      return;
    }

    setBusy(true);
    const response = await fetch("/api/profile/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    if (response.ok) {
      setSaved(true);
      setBusy(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setStatus("taken");
    setMessage(data.error ?? "Could not save username");
    setBusy(false);
  }

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-label="Choose username">
      <div className="onboarding-panel">
        {saved ? (
          <>
            <h2>
              Welcome to <Image src="/assets/Cova-logo-white.svg" alt="Cova" width={188} height={62} priority /> @{username}!
            </h2>
            <p>You can now share your Cova profile with your friends by sharing your unique link:</p>
            <div className="profile-link">cova.quest/{username}</div>
            <button className="pill-button onboarding-done" onClick={() => router.refresh()}>
              Done
            </button>
          </>
        ) : (
          <>
            <h2>
              Welcome to <Image src="/assets/Cova-logo-white.svg" alt="Cova" width={188} height={62} priority />
            </h2>
            <p>Get started by getting your own custom username</p>

            <label className="username-field">
              <span>cova.quest/@</span>
              <input
                autoFocus
                value={username}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                minLength={3}
                maxLength={10}
                pattern="[a-z0-9-]{3,10}"
                aria-label="Username"
              />
            </label>

            <div className={`username-status ${status}`}>
              {status === "checking" ? "Checking..." : message}
            </div>
            <div className="username-help">Username should be between 3-10 characters</div>

            {status === "available" ? (
              <button className="pill-button onboarding-save" disabled={busy} onClick={save}>
                Continue
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
}
