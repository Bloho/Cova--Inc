"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const USERNAME_RE = /^[a-z0-9-]{3,10}$/;
const MAX_AVATAR_BYTES = 1024 * 1024;

type OnboardingModalProps = {
  initialUsername?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  demo?: boolean;
};

export function OnboardingModal({
  initialUsername = "",
  initialDisplayName = "",
  initialAvatarUrl = null,
  demo = false
}: OnboardingModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState(normalizeUsername(initialUsername ?? ""));
  const [displayName, setDisplayName] = useState(initialDisplayName?.slice(0, 16) ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState("Choose a 3-10 character handle");
  const [avatarError, setAvatarError] = useState("");
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
      body: JSON.stringify({ username, displayName: displayName.trim(), avatarUrl })
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

  async function selectAvatar(file?: File) {
    setAvatarError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Maximum image size is 1 MB.");
      return;
    }

    try {
      const compressed = await compressAvatar(file);
      setAvatarUrl(compressed);
    } catch {
      setAvatarError("Could not read that image.");
    }
  }

  const slide = `/assets/slide-${step}.png`;

  return (
    <div className={`onboarding-backdrop${demo ? " onboarding-demo" : ""}`} role="dialog" aria-modal="true" aria-label="Set up your Cova profile">
      <section className={`onboarding-panel onboarding-step-${step}`}>
        <div className="onboarding-art" aria-hidden="true">
          <Image key={slide} src={slide} alt="" fill sizes="(max-width: 800px) 100vw, 50vw" priority className="onboarding-art-image" />
        </div>

        <div className="onboarding-content">
          {step === 1 ? (
            <div className="onboarding-stage" key="welcome">
              <div className="onboarding-stage-body">
                <Image className="onboarding-logo" src="/assets/Cova-logo-white.svg" alt="Cova" width={520} height={172} priority />
                <p className="onboarding-description">A modern social platform for movie lovers to track what they watch, rate and review films, build watchlists, discover new favorites, and connect with friends.</p>
              </div>
              <button className="onboarding-primary" onClick={() => setStep(2)}>Get started</button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="onboarding-stage onboarding-setup" key="setup">
              <div className="onboarding-stage-body">
                <h1>Set up your profile</h1>
                <button className="onboarding-avatar-placeholder" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Add profile picture">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : null}
                </button>
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
                  <p className={`onboarding-handle-status ${avatarError ? "invalid" : status}`}>{avatarError || (status === "checking" ? "Checking username..." : message)}</p>
                </div>
              </div>
              <button className="onboarding-primary" disabled={!canContinue} onClick={completeSetup}>{busy ? "Saving..." : "Next"}</button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void selectAvatar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="onboarding-stage onboarding-complete" key="complete">
              <div className="onboarding-stage-body">
                <h1>Welcome to Cova!</h1>
                <p>You can share your profile with your friends by sharing <strong>{`cova.lol/${username}`}</strong></p>
              </div>
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

async function compressAvatar(file: File) {
  const image = await loadFileImage(file);
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  const sourceSize = Math.min(image.width, image.height);
  const sourceX = (image.width - sourceSize) / 2;
  const sourceY = (image.height - sourceSize) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.78);
}

function loadFileImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}
