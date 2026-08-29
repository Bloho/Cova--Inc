"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { consumeFreeUsage } from "@/lib/usage-client";

type CardStep = "intro" | "loading" | "ready";

const CARD_WIDTH = 445;
const CARD_HEIGHT = 668;
const PROFILE_VARIANT_COUNT = 50;

export function ProfileCardGenerator({ username, filmsCount, label = "Get your card" }: { username: string; filmsCount: number; label?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CardStep>("intro");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    function openCardGenerator() {
      setOpen(true);
    }

    window.addEventListener("cova-open-profile-card", openCardGenerator);
    if (window.sessionStorage.getItem("cova-open-profile-card") === "1") {
      window.sessionStorage.removeItem("cova-open-profile-card");
      window.setTimeout(openCardGenerator, 260);
    }

    return () => window.removeEventListener("cova-open-profile-card", openCardGenerator);
  }, []);

  async function generateCard() {
    setOpen(true);
    setStep("loading");
    setError("");
    setConfirmCancel(false);

    try {
      const [url] = await Promise.all([renderProfileCard({ username, filmsCount }), holdLoadingFrame()]);
      setCardUrl(url);
      setStep("ready");
    } catch {
      setError("Could not generate your card. Try again.");
      setStep("intro");
    }
  }

  async function downloadCard() {
    if (!cardUrl) {
      return;
    }

    try {
      if (!await consumeFreeUsage("profile_card_export")) return;
      const link = document.createElement("a");
      link.href = cardUrl;
      link.download = `cova-${username}-profile-card.png`;
      link.click();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare that download. Try again.");
    }
  }

  function requestClose() {
    setConfirmCancel(true);
  }

  function cancelClose() {
    setConfirmCancel(false);
  }

  function confirmClose() {
    setOpen(false);
    setStep("intro");
    setCardUrl(null);
    setError("");
    setConfirmCancel(false);
  }

  return (
    <>
      <button className="pill-button profile-card-trigger" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <div
          className="modal-backdrop profile-card-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Generate profile card"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              requestClose();
            }
          }}
        >
          <div className="profile-card-modal" onMouseDown={(event) => event.stopPropagation()}>
            {step === "intro" ? (
              <>
                <h2>You can now get your own personalised card to share with your friends!</h2>
                <button className="card-modal-button" onClick={generateCard}>
                  Generate for free
                </button>
                <Image className="card-stack-preview" src="/assets/card-stack-for-pop-up.svg" alt="" width={270} height={150} priority={false} />
                {error ? <p className="form-message">{error}</p> : null}
              </>
            ) : null}

            {step === "loading" ? (
              <div className="card-loading">
                <h2>Hold tight, your card is being generated!</h2>
                <span aria-label="Generating" />
              </div>
            ) : null}

            {step === "ready" && cardUrl ? (
              <div className="card-ready">
                <img className="generated-profile-card" src={cardUrl} alt="Generated Cova profile card" />
                <div className="card-ready-copy">
                  <h2>Your card has been successfully generated!</h2>
                  <button className="card-modal-button icon-card-button" onClick={() => void downloadCard()}>
                    <img src="/icons/download.svg" alt="" />
                    Download
                  </button>
                  <button className="card-modal-button icon-card-button" onClick={generateCard}>
                    <img src="/icons/redo.svg" alt="" />
                    Regenerate
                  </button>
                </div>
              </div>
            ) : null}

            {confirmCancel ? (
              <div className="card-cancel-confirm" role="alertdialog" aria-modal="true" aria-label="Cancel card generation">
                <div>
                  <h3>Cancel card?</h3>
                  <p>Your generated card will be discarded if you close this.</p>
                </div>
                <div className="card-confirm-actions">
                  <button className="card-modal-button compact" onClick={confirmClose}>
                    Cancel card
                  </button>
                  <button className="card-modal-button compact primary" onClick={cancelClose}>
                    Keep going
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

async function renderProfileCard({ username, filmsCount }: { username: string; filmsCount: number }) {
  const variantIndex = Math.floor(Math.random() * PROFILE_VARIANT_COUNT) + 1;
  const variantSrc = `/profile-card-variants/${encodeURIComponent(`Frame ${variantIndex}.svg`)}`;
  const [background, moviesMark, logo] = await Promise.all([
    loadImage(variantSrc),
    loadImage("/utilities/MOVIES.svg"),
    loadImage("/assets/Cova-logo-white.svg"),
    loadCardNumberFont()
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }

  ctx.drawImage(background, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = '700 37px "PP Neue Montreal", Arial, sans-serif';
  ctx.fillText(getCinephileRank(filmsCount), CARD_WIDTH / 2, 91);

  ctx.fillStyle = "#000000";
  ctx.font = '900 164px "Cova Card Number", Impact, sans-serif';
  ctx.fillText(String(filmsCount), CARD_WIDTH / 2, 342);

  const moviesMarkWidth = 153;
  const moviesMarkHeight = 30;
  ctx.drawImage(moviesMark, (CARD_WIDTH - moviesMarkWidth) / 2, 382, moviesMarkWidth, moviesMarkHeight);

  ctx.font = '700 31px "PP Neue Montreal", Arial, sans-serif';
  ctx.fillText(`cova.lol/${username}`, CARD_WIDTH / 2, 526);

  ctx.save();
  ctx.filter = "invert(1)";
  ctx.drawImage(logo, 140, 582, 165, 80);
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function holdLoadingFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 850));
}

let cardNumberFont: Promise<void> | null = null;

function loadCardNumberFont() {
  if (!cardNumberFont) {
    cardNumberFont = fetch("/fonts/Card-number.ttf")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the card number font.");
        }

        return response.arrayBuffer();
      })
      .then((data) => new FontFace("Cova Card Number", data).load())
      .then((font) => {
        document.fonts.add(font);
      });
  }

  return cardNumberFont;
}

function getCinephileRank(filmsCount: number) {
  if (filmsCount >= 1000) {
    return "Top 0.001%";
  }

  if (filmsCount >= 100) {
    return "Top 0.01%";
  }

  if (filmsCount >= 50) {
    return "Top 0.1%";
  }

  if (filmsCount >= 25) {
    return "Top 1%";
  }

  if (filmsCount >= 10) {
    return "Top 5%";
  }

  return "Top 10%";
}
