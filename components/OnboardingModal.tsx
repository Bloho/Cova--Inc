"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const USERNAME_RE = /^[a-z0-9-]{3,10}$/;

type OnboardingModalProps = {
  initialUsername?: string | null;
  initialDisplayName?: string | null;
  demo?: boolean;
};

export function OnboardingModal({
  initialUsername = "",
  initialDisplayName = "",
  demo = false
}: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState(normalizeUsername(initialUsername ?? ""));
  const [displayName, setDisplayName] = useState(initialDisplayName?.slice(0, 16) ?? "");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState("Choose a 3-10 character handle");
  const [busy, setBusy] = useState(false);

  const isUsernameValid = useMemo(() => USERNAME_RE.test(username), [username]);
  const canContinue = displayName.trim().length > 0 && isUsernameValid && status === "available" && !busy;

  useEffect(() => {
    if (step !== 2) return;

    if (!username) {
      setStatus("idle");
      setMessage("Choose a 3-10 character handle");
      return;
    }

    if (!isUsernameValid) {
      setStatus("invalid");
      setMessage("Use 3-10 letters, numbers, and dashes");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("checking");

      if (demo) {
        setStatus("available");
        setMessage("Username available");
        return;
      }

      const response = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`, {
        signal: controller.signal
      }).catch(() => null);

      if (!response) return;

      const data = (await response.json()) as { available: boolean; message: string };
      setStatus(data.available ? "available" : "taken");
      setMessage(data.message);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [demo, isUsernameValid, step, username]);

  async function completeSetup() {
    if (!canContinue) return;

    setBusy(true);

    if (demo) {
      window.setTimeout(() => {
        setBusy(false);
        setStep(3);
      }, 360);
      return;
    }

    const response = await fetch("/api/profile/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: displayName.trim() })
    });

    if (response.ok) {
      setBusy(false);
      setStep(3);
      return;
    }

    const data = await response.json().catch(() => ({}));
    setStatus("taken");
    setMessage(data.error ?? "Could not save your profile");
    setBusy(false);
  }

  const slide = `/assets/slide-${step}.png`;

  return (
    <div className={demo ? "onboarding-demo" : "onboarding-backdrop"} role="dialog" aria-modal="true" aria-label="Set up your Cova profile">
      <section className={`onboarding-panel onboarding-step-${step}`}>
        <div className="onboarding-art" aria-hidden="true">
          <Image key={slide} src={slide} alt="" fill sizes="(max-width: 800px) 100vw, 50vw" priority className="onboarding-art-image" />
        </div>

        <div className="onboarding-content">
          {step === 1 ? (
            <div className="onboarding-stage" key="welcome">
              <Image className="onboarding-logo" src="/assets/Cova-logo-white.svg" alt="Cova" width={520} height={172} priority />
              <p className="onboarding-description">A modern social platform for movie lovers to track what they watch, rate and review films, build watchlists, discover new favorites, and connect with friends.</p>
              <button className="onboarding-primary" onClick={() => setStep(2)}>Get started</button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="onboarding-stage onboarding-setup" key="setup">
              <h1>Set up your profile</h1>
              <div className="onboarding-avatar-placeholder" aria-hidden="true" />
              <div className="onboarding-fields">
                <label>
                  <span className="sr-only">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value.slice(0, 16))}
                    maxLength={16}
                    placeholder="What would you like to be called?"
                    autoFocus
                  />
                </label>
                <label>
                  <span className="sr-only">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                    minLength={3}
                    maxLength={10}
                    pattern="[a-z0-9-]{3,10}"
                    placeholder="Choose your handle"
                  />
                </label>
                <p className={`onboarding-handle-status ${status}`}>{status === "checking" ? "Checking username..." : message}</p>
              </div>
              <button className="onboarding-primary" disabled={!canContinue} onClick={completeSetup}>{busy ? "Saving..." : "Next"}</button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="onboarding-stage onboarding-complete" key="complete">
              <h1>Welcome to Cova!</h1>
              <p>You can share your profile with your friends by sharing <strong>{`cova.quest/${username}`}</strong></p>
              <button className="onboarding-primary" onClick={() => (demo ? setStep(1) : router.refresh())}>Complete</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
}
