import { NextResponse } from "next/server";
import { ADMIN_OWNER_EMAIL, AdminAccessError, assertSameOrigin, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin({ founderOnly: true });
    const body = await parseJsonBody(request) as { action?: "grant" | "revoke"; targetUserId?: string };

    if ((body.action !== "grant" && body.action !== "revoke") || !isUuid(body.targetUserId)) {
      return NextResponse.json({ error: "Invalid administrator request." }, { status: 400 });
    }

    const [{ data: target, error: targetError }, { data: profile, error: profileError }] = await Promise.all([
      context.admin.auth.admin.getUserById(body.targetUserId),
      context.admin.from("profiles").select("id").eq("id", body.targetUserId).maybeSingle()
    ]);

    if (targetError || !target?.user || profileError || !profile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (target.user.email?.trim().toLowerCase() === ADMIN_OWNER_EMAIL) {
      return NextResponse.json({ error: "The founder administrator cannot be changed." }, { status: 400 });
    }

    if (body.action === "grant") {
      const { error } = await context.admin.from("admin_roles").upsert({
        user_id: target.user.id,
        granted_by: context.user.id
      }, { onConflict: "user_id" });

      if (error) {
        return NextResponse.json({ error: "Could not grant administrator access." }, { status: 500 });
      }
    } else {
      const { error } = await context.admin.from("admin_roles").delete().eq("user_id", target.user.id);
      if (error) {
        return NextResponse.json({ error: "Could not remove administrator access." }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      userId: target.user.id,
      isAdmin: body.action === "grant"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Could not update administrator access." }, { status: 500 });
  }
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

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
