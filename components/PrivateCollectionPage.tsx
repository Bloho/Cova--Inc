import Link from "next/link";
import { redirect } from "next/navigation";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { PaginatedFilms } from "@/components/PaginatedFilms";
import { hasActiveCovaMembership } from "@/lib/billing/subscription";
import type { Movie } from "@/lib/data";
import { getCurrentUserProfile } from "@/lib/library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CollectionKind = "wishlist" | "favourites";

type CollectionMovie = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
};

type CollectionRow = {
  tmdb_id: number;
  rating: number | null;
  movies: CollectionMovie | CollectionMovie[] | null;
};

function getCollectionErrorMessage(kind: CollectionKind, message: string) {
  if (message.includes("in_watchlist") || message.includes("schema cache")) {
    return "Wishlist storage is not set up yet. Run supabase/20260822_collections.sql in the Supabase project connected to this deployment, then refresh this page.";
  }

  return `Could not load your ${kind}. Please try again.`;
}

export async function PrivateCollectionPage({ kind }: { kind: CollectionKind }) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) redirect("/login");

  const hasCovaPro = await hasActiveCovaMembership(user.id).catch(() => false);

  const supabase = await createSupabaseServerClient();
  const collectionColumn = kind === "wishlist" ? "in_watchlist" : "liked";
  const { data, error } = await supabase
    .from("user_movies")
    .select("tmdb_id, rating, movies(tmdb_id, title, poster_path, release_date, overview)")
    .eq("user_id", user.id)
    .eq(collectionColumn, true)
    .order("updated_at", { ascending: false });

  const movies = ((data ?? []) as CollectionRow[]).flatMap((row): Movie[] => {
    const movie = Array.isArray(row.movies) ? row.movies[0] : row.movies;
    if (!movie) return [];

    return [{
      tmdbId: movie.tmdb_id,
      title: movie.title,
      releaseYear: movie.release_date?.slice(0, 4) ?? "",
      rating: 0,
      watched: false,
      posterPath: movie.poster_path ?? "",
      overview: movie.overview ?? "",
      reviewCount: 0,
      userRating: Number(row.rating ?? 0)
    }];
  });
  const title = kind === "wishlist" ? "Wishlist" : "Favourites";

  return (
    <div className="profile-page collection-page">
      <MoviePageHeader
        isSignedIn
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        hasCovaPro={hasCovaPro}
        hidePrimaryActions
      />
      <main className="profile-main collection-main">
        <section className="collection-title-band"><h1>{title}</h1></section>
        <section className="profile-films collection-films">
          {error ? (
            <p className="movie-collection-error">{getCollectionErrorMessage(kind, error.message)}</p>
          ) : (
            <PaginatedFilms movies={movies} isSignedIn itemsPerPage={28} showYears={false} />
          )}
        </section>
      </main>
      <footer className="movie-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>
      </footer>
    </div>
  );
}
