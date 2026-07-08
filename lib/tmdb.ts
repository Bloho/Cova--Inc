import { unstable_cache } from "next/cache";
import { seedMovies, type Movie } from "@/lib/data";

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
};

type TmdbListResponse = {
  results: TmdbMovie[];
};

const TMDB_URL = "https://api.themoviedb.org/3";

export async function getHomeMovies() {
  const trending = await getCachedTmdbList("/trending/movie/day");
  const hasKey = Boolean(process.env.TMDB_API_KEY);

  return {
    trending: hasKey && trending.length ? trending.slice(0, 5) : seedMovies.slice(0, 5),
    isLive: hasKey
  };
}

export async function getMovie(tmdbId: number) {
  const live = await getCachedTmdbMovie(tmdbId);
  return live ?? seedMovies.find((movie) => movie.tmdbId === tmdbId) ?? seedMovies[0];
}

export async function searchMovies(query: string) {
  if (!query.trim()) {
    return [];
  }

  const live = await getCachedTmdbSearch(query.trim().toLowerCase());
  if (process.env.TMDB_API_KEY) {
    return live;
  }

  return seedMovies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()));
}

const getCachedTmdbList = unstable_cache(
  async (path: string) => fetchTmdbList(path),
  ["tmdb-list"],
  { revalidate: 60 * 30 }
);

const getCachedTmdbMovie = unstable_cache(
  async (tmdbId: number) => fetchTmdbMovie(`/movie/${tmdbId}`),
  ["tmdb-movie"],
  { revalidate: 60 * 60 }
);

const getCachedTmdbSearch = unstable_cache(
  async (query: string) => fetchTmdbList(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`),
  ["tmdb-search"],
  { revalidate: 60 * 10 }
);

async function fetchTmdbList(path: string): Promise<Movie[]> {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    return [];
  }

  const separator = path.includes("?") ? "&" : "?";
  const request = tmdbRequest(`${TMDB_URL}${path}${separator}language=en-US&page=1`, token);
  const response = await fetch(request.url, {
    headers: request.headers,
    next: { revalidate: 60 * 30 }
  }).catch(() => null);

  if (!response?.ok) {
    return [];
  }

  const data = (await response.json()) as TmdbListResponse;
  return data.results.filter((movie) => movie.poster_path).map(fromTmdb);
}

async function fetchTmdbMovie(path: string): Promise<Movie | null> {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    return null;
  }

  const request = tmdbRequest(`${TMDB_URL}${path}?language=en-US`, token);
  const response = await fetch(request.url, {
    headers: request.headers,
    next: { revalidate: 60 * 60 }
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return fromTmdb((await response.json()) as TmdbMovie);
}

function tmdbRequest(url: string, token: string) {
  const requestUrl = new URL(url);
  const headers: Record<string, string> = {
    accept: "application/json"
  };

  if (token.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    requestUrl.searchParams.set("api_key", token);
  }

  return {
    url: requestUrl.toString(),
    headers
  };
}

function fromTmdb(movie: TmdbMovie): Movie {
  const date = movie.release_date ?? movie.first_air_date ?? "";

  return {
    tmdbId: movie.id,
    title: movie.title ?? movie.name ?? "Untitled",
    releaseYear: date ? date.slice(0, 4) : "Film",
    rating: Math.max(1, Math.min(5, Math.round((movie.vote_average ?? 7) / 2))),
    averageRating: Math.max(0, Math.min(5, Number(((movie.vote_average ?? 0) / 2).toFixed(1)))),
    watched: false,
    posterPath: movie.poster_path ?? "",
    backdropPath: movie.backdrop_path ?? undefined,
    overview: movie.overview ?? "",
    reviewCount: Math.floor(((movie.vote_average ?? 7) * 13) % 40) + 4
  };
}
