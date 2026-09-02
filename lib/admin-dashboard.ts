import type { AdminContext } from "@/lib/admin";
import { isAdminOwnerEmail } from "@/lib/admin";

export type AdminCatalogMovie = {
  id: number;
  overview: string;
  posterPath: string | null;
  releaseYear: string | null;
  title: string;
};

export type AdminDashboardUser = {
  createdAt: string;
  displayName: string;
  email: string;
  id: string;
  isAdmin: boolean;
  isFounder: boolean;
  username: string | null;
};

export type AdminDashboardData = {
  customFilms: AdminCatalogMovie[];
  stats: {
    administrators: number;
    customFilms: number;
    films: number;
    users: number;
  };
  users: AdminDashboardUser[];
};

export async function getAdminDashboardData({ admin, user }: AdminContext): Promise<AdminDashboardData> {
  const [userCount, filmCount, customFilmCount, customFilmResult, rolesResult, authUsersResult] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("movies").select("tmdb_id", { count: "exact", head: true }),
    admin.from("movies").select("tmdb_id", { count: "exact", head: true }).eq("is_custom", true),
    admin
      .from("movies")
      .select("tmdb_id, title, poster_path, release_date, overview")
      .eq("is_custom", true)
      .order("cached_at", { ascending: false })
      .limit(100),
    admin.from("admin_roles").select("user_id"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  ]);

  if (
    userCount.error ||
    filmCount.error ||
    customFilmCount.error ||
    customFilmResult.error ||
    rolesResult.error ||
    authUsersResult.error
  ) {
    throw new Error("The admin database schema is unavailable.");
  }

  const authUsers = authUsersResult.data.users;
  const knownUsers = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  if (!knownUsers.has(user.id)) {
    knownUsers.set(user.id, user);
  }

  const roleIds = new Set((rolesResult.data ?? []).map((role) => role.user_id as string));
  const profileIds = Array.from(knownUsers.keys());
  const { data: profiles, error: profilesError } = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, username, display_name")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error("Could not load account profiles.");
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id as string, profile]));
  const users = Array.from(knownUsers.values())
    .map((authUser) => {
      const profile = profilesById.get(authUser.id);
      const email = authUser.email ?? "Unknown email";
      const isFounder = isAdminOwnerEmail(email);

      return {
        id: authUser.id,
        email,
        displayName: profile?.display_name ?? authUser.user_metadata?.full_name ?? email.split("@")[0],
        username: profile?.username ?? null,
        createdAt: authUser.created_at,
        isFounder,
        isAdmin: isFounder || roleIds.has(authUser.id)
      } satisfies AdminDashboardUser;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const founderId = users.find((account) => account.isFounder)?.id;
  const administratorIds = new Set(roleIds);
  if (founderId) administratorIds.add(founderId);

  return {
    customFilms: (customFilmResult.data ?? []).map((movie) => ({
      id: Number(movie.tmdb_id),
      title: movie.title,
      posterPath: movie.poster_path ?? null,
      releaseYear: movie.release_date ? String(movie.release_date).slice(0, 4) : null,
      overview: movie.overview ?? ""
    })),
    stats: {
      users: userCount.count ?? 0,
      films: filmCount.count ?? 0,
      customFilms: customFilmCount.count ?? 0,
      administrators: administratorIds.size
    },
    users
  };
}
