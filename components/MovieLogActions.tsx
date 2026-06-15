"use client";

import { MessageCircle, Share2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Movie } from "@/lib/data";
import { posterUrl } from "@/lib/data";

export function MovieLogActions({
  movie,
  isSignedIn,
  initialRating = 0,
  initialReviewed = false,
  username
}: {
  movie: Movie;
  isSignedIn: boolean;
  initialRating?: number;
  initialReviewed?: boolean;
  username?: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [shareMessage, setShareMessage] = useState("");

  async function save(nextRating = rating, nextReview = review) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie, rating: nextRating, review: nextReview.trim() })
    });

    if (response.ok) {
      if (nextReview.trim()) {
        setReviewed(true);
      }
      router.refresh();
      setOpen(false);
    }

    setBusy(false);
  }

  async function shareMovieCard() {
    if (!reviewed || !username) {
      return;
    }

    setBusy(true);
    setShareMessage("");

    try {
      const blob = await renderMovieCard({ movie, rating: rating || initialRating || 0, username });
      const file = new File([blob], `cova-${movie.tmdbId}-movie-card.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: movie.title,
          text: `I reviewed ${movie.title} on Cova.`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setShareMessage("Could not generate the movie card.");
    }

    setBusy(false);
  }

  return (
    <div className="movie-log-panel">
      <div className="rating-picker compact" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className={value <= rating ? "active" : ""}
            disabled={busy}
            onClick={() => {
              setRating(value);
              void save(value, "");
            }}
          >
            <Star size={18} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <button className="pill-button secondary" disabled={busy} onClick={() => setOpen((current) => !current)}>
        <MessageCircle size={18} />
        Review
      </button>
      {reviewed ? (
        <button className="pill-button secondary" disabled={busy} onClick={shareMovieCard}>
          <Share2 size={18} />
          Share card
        </button>
      ) : null}
      {open ? (
        <div className="inline-review">
          <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Write a review..." />
          <button className="pill-button" disabled={busy || !review.trim()} onClick={() => save(rating, review)}>
            Save review
          </button>
        </div>
      ) : null}
      {shareMessage ? <p className="form-message">{shareMessage}</p> : null}
    </div>
  );
}

async function renderMovieCard({ movie, rating, username }: { movie: Movie; rating: number; username: string }) {
  const variantIndex = Math.floor(Math.random() * 10) + 1;
  const [background, poster] = await Promise.all([
    loadImage(`/movie-card-variants/${encodeURIComponent(`Variant ${variantIndex}.svg`)}`),
    loadImage(posterUrl(movie.posterPath, "w500"))
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 445;
  canvas.height = 668;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable");
  }

  ctx.drawImage(background, 0, 0, 445, 668);
  drawCoveredImage(ctx, poster, 28, 25, 390, 504);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#111111";
  ctx.font = '700 27px "PP Neue Montreal", Arial, sans-serif';
  ctx.fillText("I scored", 118, 576);
  ctx.fillText("a", 329, 576);

  ctx.fillStyle = "#ff1212";
  ctx.fillText(movie.title, 224, 576, 190);

  ctx.fillStyle = "#111111";
  ctx.font = '700 44px "PP Neue Montreal", Arial, sans-serif';
  ctx.fillText("★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(5 - Math.max(0, Math.min(5, rating))), 222, 620);

  ctx.fillStyle = "white";
  ctx.font = '700 18px "PP Neue Montreal", Arial, sans-serif';
  ctx.fillText(`cova.quest/${username}`, 222, 648, 350);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not export card"))), "image/png");
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoveredImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const imageRatio = image.width / image.height;
  const frameRatio = width / height;
  const sourceWidth = imageRatio > frameRatio ? image.height * frameRatio : image.width;
  const sourceHeight = imageRatio > frameRatio ? image.height : image.width / frameRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}
