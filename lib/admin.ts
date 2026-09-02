import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_OWNER_EMAIL = "ayush.lowkey@gmail.com";

export type AdminContext = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  isFounder: boolean;
  user: User;
};

export class AdminAccessError extends Error {
  constructor(message: string, public readonly status: 401 | 403 | 503) {
    super(message);
  }
}

export async function requireAdmin(options: { founderOnly?: boolean } = {}): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AdminAccessError("Sign in is required.", 401);
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    throw new AdminAccessError("The admin service is not configured.", 503);
  }

  const isFounder = user.email?.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
  if (options.founderOnly && !isFounder) {
    throw new AdminAccessError("Only the Cova founder can manage administrators.", 403);
  }

  if (!isFounder) {
    const { data: role, error } = await admin
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new AdminAccessError("Admin permissions are not configured. Run the admin migration first.", 503);
    }

    if (!role) {
      throw new AdminAccessError("You do not have access to Cova administration.", 403);
    }
  }

  return { admin, isFounder, user };
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) {
    throw new AdminAccessError("This request could not be verified.", 403);
  }

  try {
    if (new URL(origin).host !== host.split(",")[0].trim()) {
      throw new AdminAccessError("This request could not be verified.", 403);
    }
  } catch (error) {
    if (error instanceof AdminAccessError) throw error;
    throw new AdminAccessError("This request could not be verified.", 403);
  }
}
