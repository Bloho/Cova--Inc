import { NextResponse } from "next/server";
import { searchCustomMovies, searchMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  const normalizedQuery = query?.trim().slice(0, 120) ?? "";
  if (!normalizedQuery) {
    return NextResponse.json({ results: [] });
  }

  const [customMovies, tmdbMovies] = await Promise.all([
    searchCustomMovies(normalizedQuery),
    searchMovies(normalizedQuery)
  ]);

  return NextResponse.json({
    results: [...customMovies, ...tmdbMovies].slice(0, 20),
    source: process.env.TMDB_API_KEY ? "tmdb" : "seed"
  }, { headers: { "Cache-Control": "no-store" } });
}
