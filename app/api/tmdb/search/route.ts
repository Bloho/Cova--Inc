import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({
    results: await searchMovies(query),
    source: process.env.TMDB_API_KEY ? "tmdb" : "seed"
  });
}
