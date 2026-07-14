"use client";

import { useState } from "react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";

type CardLayout = "horizontal" | "square" | "vertical";
type CardStep = "select" | "loading" | "ready";

type LayoutConfig = {
  label: string;
  preview: string;
  width: number;
  height: number;
  variantPath: (variant: number) => string;
  maskPath: string;
  maskOffset: { x: number; y: number };
  quote: { x: number; y: number; width: number; lines: number };
  stars: { x: number; y: number };
  link: { x: number; y: number; color?: string };
};

const VARIANT_COUNT = 15;
const STAR_WIDTH = 67.16;
const STAR_HEIGHT = 64;
const STAR_GAP = 9;

const LAYOUTS: Record<CardLayout, LayoutConfig> = {
  horizontal: {
    label: "Horizontal layout",
    preview: "/assets/horizontal-card-preview.svg",
    width: 900,
    height: 600,
    variantPath: (variant) => `/movie-card-variants/horizontal/movie-card-variant-landscape-${variant}.svg`,
    maskPath: "/movie-card-variants/masks/horizontal-variant-mask.svg",
    maskOffset: { x: 10, y: 10 },
    quote: { x: 485, y: 282, width: 390, lines: 4 },
    stars: { x: 485, y: 506 },
    link: { x: 485, y: 566 }
  },
  square: {
    label: "Square layout",
    preview: "/assets/square-card-preview.svg",
    width: 900,
    height: 900,
    variantPath: (variant) => `/movie-card-variants/square/movie-card-variant-square-${variant}.svg`,
    maskPath: "/movie-card-variants/masks/square-variant-mask.svg",
    maskOffset: { x: 14, y: 14 },
    quote: { x: 31, y: 621, width: 620, lines: 3 },
    stars: { x: 31, y: 807 },
    link: { x: 15, y: 860, color: "rgba(255, 255, 255, 0.5)" }
  },
  vertical: {
    label: "Vertical layout",
    preview: "/assets/vertical-card-preview.svg",
    width: 600,
    height: 900,
    variantPath: (variant) => `/movie-card-variants/potrait/movie-card-variant-potrait-${variant}.svg`,
    maskPath: "/movie-card-variants/masks/potrait-variant-mask.svg",
    maskOffset: { x: 16, y: 15 },
    quote: { x: 25, y: 630, width: 550, lines: 2 },
    stars: { x: 25, y: 756 },
    link: { x: 25, y: 858 }
  }
};

export function MovieCardGenerator({
  movie,
  review,
  rating,
  username,
  onClose
}: {
  movie: Movie;
  review: string;
  rating: number;
  username?: string | null;
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<CardLayout>("square");
  const [step, setStep] = useState<CardStep>("select");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardVariant, setCardVariant] = useState<number | null>(null);
  const [downloadingScale, setDownloadingScale] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function generateCard() {
    setStep("loading");
    setError("");

    try {
      const variant = Math.floor(Math.random() * VARIANT_COUNT) + 1;
      const [url] = await Promise.all([
        renderMovieCard({ movie, review, rating, username, layout, variant }),
        holdLoadingFrame()
      ]);
      setCardUrl(url);
      setCardVariant(variant);
      setStep("ready");
    } catch (cause) {
      console.error("Cova movie card generation failed", cause);
      setError("Could not generate your card. Try again.");
      setStep("select");
    }
  }

  async function downloadCard(scale: number) {
    if (!cardUrl || !cardVariant || downloadingScale) {
      return;
    }

    setDownloadingScale(scale);
    try {
      const image = scale === 1
        ? cardUrl
        : await renderMovieCard({ movie, review, rating, username, layout, variant: cardVariant, scale });
      const link = document.createElement("a");
      link.href = image;
      link.download = `cova-${slugify(movie.title)}-${layout}-${scale === 1 ? "1x" : "1-5x"}-card.png`;
      link.click();
    } catch {
      setError("Could not prepare that download. Try again.");
    } finally {
      setDownloadingScale(null);
    }
  }

  return (
    <div className="movie-card-dialog" onMouseDown={(event) => event.stopPropagation()}>
      {step === "select" ? (
        <>
          <h2>Select layout</h2>
          <div className="movie-card-layouts" role="radiogroup" aria-label="Movie card layout">
            {(Object.keys(LAYOUTS) as CardLayout[]).map((key) => {
              const config = LAYOUTS[key];
              const selected = key === layout;

              return (
                <button
                  className={`movie-card-layout-option${selected ? " selected" : ""}`}
                  key={key}
                  onClick={() => setLayout(key)}
                  role="radio"
                  aria-checked={selected}
                  type="button"
                >
                  <img src={config.preview} alt="" />
                  <span>{config.label}</span>
                  <i aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <button className="card-modal-button movie-card-generate" onClick={generateCard} type="button">
            Generate card
          </button>
          {error ? <p className="form-message">{error}</p> : null}
        </>
      ) : null}

      {step === "loading" ? (
        <div className="card-loading movie-card-loading">
          <h2>Give us a second, your card is being generated!</h2>
          <span aria-label="Generating" />
        </div>
      ) : null}

      {step === "ready" && cardUrl ? (
        <div className="movie-card-ready">
          <img className={`generated-movie-card ${layout}`} src={cardUrl} alt={`Generated ${movie.title} card`} />
          <h2>Your card is generated!</h2>
          <button className="card-modal-button compact icon-card-button" disabled={Boolean(downloadingScale)} onClick={() => downloadCard(1)} type="button">
            <img src="/icons/download.svg" alt="" />
            {downloadingScale === 1 ? "Preparing..." : "Download 1x"}
          </button>
          <button className="card-modal-button compact icon-card-button" disabled={Boolean(downloadingScale)} onClick={() => downloadCard(1.5)} type="button">
            <img src="/icons/download.svg" alt="" />
            {downloadingScale === 1.5 ? "Preparing..." : "Download 1.5x"}
          </button>
          <button className="card-modal-button compact icon-card-button" onClick={generateCard} type="button">
            <img src="/icons/redo.svg" alt="" />
            Regenerate
          </button>
          <button className="movie-card-close" onClick={onClose} type="button">
            Done
          </button>
          {error ? <p className="form-message">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

async function renderMovieCard({
  movie,
  review,
  rating,
  username,
  layout,
  variant,
  scale = 1
}: {
  movie: Movie;
  review: string;
  rating: number;
  username?: string | null;
  layout: CardLayout;
  variant: number;
  scale?: number;
}) {
  const config = LAYOUTS[layout];
  const [background, poster, star] = await Promise.all([
    loadImage(config.variantPath(variant)),
    loadImage(posterUrl(movie.posterPath, "w780"), true),
    loadImage("/assets/star.svg")
  ]);
  const mask = await loadImage(config.maskPath).catch(() => null);

  await document.fonts.load('700 48px "Cova Card"');

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(config.width * scale);
  canvas.height = Math.round(config.height * scale);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }

  ctx.scale(scale, scale);
  ctx.drawImage(background, 0, 0, config.width, config.height);
  drawMaskedPoster(ctx, poster, mask, config);
  drawQuote(ctx, review, config.quote);
  drawRating(ctx, star, rating, config.stars);
  drawProfileLink(ctx, username, config.link, config.width);

  return canvas.toDataURL("image/png");
}

function drawMaskedPoster(ctx: CanvasRenderingContext2D, poster: HTMLImageElement, mask: HTMLImageElement | null, config: LayoutConfig) {
  if (!mask) {
    drawFallbackMaskedPoster(ctx, poster, config);
    return;
  }

  const maskedPoster = document.createElement("canvas");
  maskedPoster.width = config.width;
  maskedPoster.height = config.height;
  const maskedContext = maskedPoster.getContext("2d");

  if (!maskedContext) {
    throw new Error("Canvas is unavailable");
  }

  drawCover(maskedContext, poster, 0, 0, config.width, config.height);
  maskedContext.globalCompositeOperation = "destination-in";
  maskedContext.drawImage(mask, config.maskOffset.x, config.maskOffset.y);
  ctx.drawImage(maskedPoster, 0, 0, config.width, config.height);
}

function drawFallbackMaskedPoster(ctx: CanvasRenderingContext2D, poster: HTMLImageElement, config: LayoutConfig) {
  ctx.save();
  ctx.beginPath();

  if (config.width === 900 && config.height === 600) {
    ctx.moveTo(22, 10);
    ctx.lineTo(879, 10);
    ctx.quadraticCurveTo(891, 10, 891, 22);
    ctx.lineTo(891, 222);
    ctx.quadraticCurveTo(891, 234, 879, 234);
    ctx.lineTo(452, 234);
    ctx.quadraticCurveTo(440, 234, 440, 246);
    ctx.lineTo(440, 579);
    ctx.quadraticCurveTo(440, 591, 428, 591);
    ctx.lineTo(22, 591);
    ctx.quadraticCurveTo(10, 591, 10, 579);
    ctx.lineTo(10, 22);
    ctx.quadraticCurveTo(10, 10, 22, 10);
  } else if (config.width === 600) {
    ctx.roundRect(16, 15, 568, 581, 12);
  } else {
    ctx.moveTo(26, 14);
    ctx.lineTo(874, 14);
    ctx.quadraticCurveTo(886, 14, 886, 26);
    ctx.lineTo(886, 873);
    ctx.quadraticCurveTo(886, 885, 874, 885);
    ctx.lineTo(679, 885);
    ctx.quadraticCurveTo(667, 885, 667, 873);
    ctx.lineTo(667, 607);
    ctx.quadraticCurveTo(667, 595, 655, 595);
    ctx.lineTo(26, 595);
    ctx.quadraticCurveTo(14, 595, 14, 583);
    ctx.lineTo(14, 26);
    ctx.quadraticCurveTo(14, 14, 26, 14);
  }

  ctx.closePath();
  ctx.clip();
  drawCover(ctx, poster, 0, 0, config.width, config.height);
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawQuote(ctx: CanvasRenderingContext2D, review: string, box: LayoutConfig["quote"]) {
  ctx.fillStyle = "#000";
  ctx.font = '700 48px "Cova Card", "SF Pro Display", Arial, sans-serif';
  ctx.textBaseline = "top";
  const lines = wrapQuote(ctx, review, box.width, box.lines);
  lines.forEach((line, index) => ctx.fillText(line, box.x, box.y + index * 50));
}

function wrapQuote(ctx: CanvasRenderingContext2D, review: string, maxWidth: number, maxLines: number) {
  const words = review.trim().replace(/\s+/g, " ").replace(/[“”]/g, "").split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "“";
  let truncated = false;

  for (let index = 0; index < words.length; index += 1) {
    const candidate = line === "“" ? `“${words[index]}` : `${line} ${words[index]}`;
    const closesHere = index === words.length - 1;
    const visibleCandidate = `${candidate}${closesHere ? "”" : ""}`;

    if (ctx.measureText(visibleCandidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (lines.length === maxLines - 1) {
      truncated = true;
      break;
    }

    lines.push(line);
    line = words[index];
  }

  if (lines.length < maxLines && line) {
    lines.push(line);
  }

  if (!lines.length) {
    return ["“A film worth sharing.”"];
  }

  const last = lines.length - 1;
  if (truncated) {
    let candidate = `${lines[last].replace(/[.\s]+$/, "")}...”`;
    while (ctx.measureText(candidate).width > maxWidth && candidate.length > 5) {
      candidate = `${candidate.slice(0, -5).trimEnd()}...”`;
    }
    lines[last] = candidate;
  } else {
    lines[last] = `${lines[last]}”`;
  }

  return lines;
}

function drawRating(ctx: CanvasRenderingContext2D, star: HTMLImageElement, rating: number, point: LayoutConfig["stars"]) {
  const normalized = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));
  const count = Math.ceil(normalized);

  for (let index = 0; index < count; index += 1) {
    const fill = Math.min(1, normalized - index);
    ctx.save();
    ctx.beginPath();
    ctx.rect(point.x + index * (STAR_WIDTH + STAR_GAP), point.y, STAR_WIDTH * fill, STAR_HEIGHT);
    ctx.clip();
    ctx.drawImage(star, point.x + index * (STAR_WIDTH + STAR_GAP), point.y, STAR_WIDTH, STAR_HEIGHT);
    ctx.restore();
  }
}

function drawProfileLink(ctx: CanvasRenderingContext2D, username: string | null | undefined, point: LayoutConfig["link"], width: number) {
  const profileLink = username ? `cova.quest/${username}` : "cova.quest";
  ctx.fillStyle = point.color ?? "rgba(0, 0, 0, 0.35)";
  ctx.font = '700 30px "Cova Card", "SF Pro Display", Arial, sans-serif';
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = point.x > width / 2 ? "right" : "left";
  ctx.fillText(profileLink, point.x > width / 2 ? width - 25 : point.x, point.y);
  ctx.textAlign = "left";
}

function loadImage(src: string, crossOrigin = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    if (crossOrigin) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function holdLoadingFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 900));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "movie";
}
