"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Movie } from "@/lib/data";

type Collection = "wishlist" | "favourite";

type MovieCollectionActionsProps = {
  movie: Movie;
  isSignedIn: boolean;
  initialInWishlist: boolean;
  initialFavourite: boolean;
};

export function MovieCollectionActions({
  movie,
  isSignedIn,
  initialInWishlist,
  initialFavourite
}: MovieCollectionActionsProps) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isFavourite, setIsFavourite] = useState(initialFavourite);
  const [pending, setPending] = useState<Collection | null>(null);
  const [error, setError] = useState("");

  async function toggleCollection(collection: Collection) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    const active = collection === "wishlist" ? inWishlist : isFavourite;
    if (collection === "wishlist") setInWishlist(!active);
    else setIsFavourite(!active);

    setPending(collection);
    setError("");

    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection,
          active: !active,
          movie: {
            tmdbId: movie.tmdbId,
            title: movie.title,
            releaseYear: movie.releaseYear,
            posterPath: movie.posterPath,
            overview: movie.overview
          }
        })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not update this collection.");
      }

      router.refresh();
    } catch (requestError) {
      if (collection === "wishlist") setInWishlist(active);
      else setIsFavourite(active);
      setError(requestError instanceof Error ? requestError.message : "Could not update this collection.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="movie-collection-actions">
      <button
        type="button"
        className={`movie-collection-button wishlist${inWishlist ? " is-added" : ""}`}
        aria-pressed={inWishlist}
        disabled={pending !== null}
        onClick={() => void toggleCollection("wishlist")}
      >
        <span className="movie-collection-icon" aria-hidden />
        <span>{inWishlist ? "Added to wishlist!" : "Add it to wishlist"}</span>
      </button>
      <button
        type="button"
        className={`movie-collection-button favourite${isFavourite ? " is-added" : ""}`}
        aria-pressed={isFavourite}
        disabled={pending !== null}
        onClick={() => void toggleCollection("favourite")}
      >
        <span className="movie-collection-icon" aria-hidden />
        <span>{isFavourite ? "Added to favourites" : "Add it to favourites"}</span>
      </button>
      {error ? <p className="movie-collection-error">{error}</p> : null}
    </div>
  );
}
