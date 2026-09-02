import { NextResponse } from "next/server";
import { AdminAccessError, assertSameOrigin, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const movie = parseMoviePayload(await parseJsonBody(request));

    const { data, error } = await context.admin
      .from("movies")
      .insert({
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.posterPath,
        release_date: movie.releaseYear ? `${movie.releaseYear}-01-01` : null,
        runtime: movie.runtime,
        is_custom: true,
        created_by: context.user.id,
        cached_at: new Date().toISOString()
      })
      .select("tmdb_id, title, poster_path, release_date, overview")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not create this custom film." }, { status: 500 });
    }

    return NextResponse.json({
      movie: {
        id: Number(data.tmdb_id),
        title: data.title,
        posterPath: data.poster_path ?? null,
        releaseYear: data.release_date ? String(data.release_date).slice(0, 4) : null,
        overview: data.overview ?? ""
      }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const id = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isSafeInteger(id) || id >= 0) {
      return NextResponse.json({ error: "Invalid custom film." }, { status: 400 });
    }

    const { data, error } = await context.admin
      .from("movies")
      .delete()
      .eq("tmdb_id", id)
      .eq("is_custom", true)
      .select("tmdb_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Could not remove this custom film." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Custom film not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function parseMoviePayload(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new AdminValidationError("Invalid custom film.");
  }

  const body = value as Record<string, unknown>;
  const title = normalizeText(body.title, 160);
  const overview = normalizeText(body.overview, 2_400) ?? "";
  const posterPath = parsePosterUrl(body.posterPath);
  const releaseYear = parseReleaseYear(body.releaseYear);
  const runtime = parseRuntime(body.runtime);

  if (!title) {
    throw new AdminValidationError("A film title is required.");
  }

  return { title, overview, posterPath, releaseYear, runtime };
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text && text.length <= maxLength ? text : null;
}

function parsePosterUrl(value: unknown) {
  if (value === null || value === undefined || value === "") {
    throw new AdminValidationError("A poster URL is required.");
  }
  if (typeof value !== "string" || value.length > 2_000) {
    throw new AdminValidationError("Poster URL must be a valid HTTPS URL.");
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("Invalid protocol");
    return url.toString();
  } catch {
    throw new AdminValidationError("Poster URL must be a valid HTTPS URL.");
  }
}

function parseReleaseYear(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
    throw new AdminValidationError("Release year must be a four-digit year.");
  }

  const year = Number(value);
  if (year < 1888 || year > 2100) {
    throw new AdminValidationError("Release year is outside the supported range.");
  }

  return value;
}

function parseRuntime(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const runtime = Number(value);
  if (!Number.isInteger(runtime) || runtime < 1 || runtime > 600) {
    throw new AdminValidationError("Runtime must be between 1 and 600 minutes.");
  }

  return runtime;
}

class AdminValidationError extends Error {}

async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminValidationError("Invalid request body.");
  }

  const body = await request.text();
  if (body.length > 10_000) throw new AdminValidationError("Invalid request body.");

  try {
    return JSON.parse(body);
  } catch {
    throw new AdminValidationError("Invalid request body.");
  }
}

function adminErrorResponse(error: unknown) {
  if (error instanceof AdminValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof AdminAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Could not complete this admin action." }, { status: 500 });
}
