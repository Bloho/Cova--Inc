"use client";

import Link from "next/link";
import { Film, LayoutDashboard, LoaderCircle, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminCatalogMovie, AdminDashboardData, AdminDashboardUser } from "@/lib/admin-dashboard";

type AdminTab = "overview" | "films" | "users" | "admins";

const emptyFilmForm = {
  title: "",
  releaseYear: "",
  posterPath: "",
  overview: "",
  runtime: ""
};

export function AdminDashboard({
  customFilms: initialCustomFilms,
  isFounder,
  stats: initialStats,
  users: initialUsers
}: AdminDashboardData & { isFounder: boolean }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [customFilms, setCustomFilms] = useState(initialCustomFilms);
  const [filmForm, setFilmForm] = useState(emptyFilmForm);
  const [filmMessage, setFilmMessage] = useState("");
  const [isCreatingFilm, setIsCreatingFilm] = useState(false);
  const [removingFilmId, setRemovingFilmId] = useState<number | null>(null);
  const [roleMessage, setRoleMessage] = useState("");
  const [rolePendingId, setRolePendingId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [stats, setStats] = useState(initialStats);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((account) => [account.displayName, account.email, account.username ?? ""]
      .some((value) => value.toLowerCase().includes(normalizedQuery)));
  }, [userQuery, users]);

  const administrators = users.filter((account) => account.isAdmin);

  async function createFilm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilmMessage("");
    setIsCreatingFilm(true);

    try {
      const response = await fetch("/api/admin/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filmForm)
      });
      const payload = await response.json() as { error?: string; movie?: AdminCatalogMovie };

      if (!response.ok || !payload.movie) {
        throw new Error(payload.error ?? "Could not create this custom film.");
      }

      setCustomFilms((current) => [payload.movie!, ...current]);
      setStats((current) => ({
        ...current,
        films: current.films + 1,
        customFilms: current.customFilms + 1
      }));
      setFilmForm(emptyFilmForm);
      setFilmMessage("Custom film added to the catalog.");
    } catch (error) {
      setFilmMessage(error instanceof Error ? error.message : "Could not create this custom film.");
    } finally {
      setIsCreatingFilm(false);
    }
  }

  async function removeFilm(film: AdminCatalogMovie) {
    if (!window.confirm(`Remove “${film.title}” from Cova? This also removes activity attached to this custom film.`)) {
      return;
    }

    setFilmMessage("");
    setRemovingFilmId(film.id);

    try {
      const response = await fetch(`/api/admin/movies?id=${encodeURIComponent(film.id)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not remove this custom film.");

      setCustomFilms((current) => current.filter((currentFilm) => currentFilm.id !== film.id));
      setStats((current) => ({
        ...current,
        films: Math.max(0, current.films - 1),
        customFilms: Math.max(0, current.customFilms - 1)
      }));
      setFilmMessage("Custom film removed.");
    } catch (error) {
      setFilmMessage(error instanceof Error ? error.message : "Could not remove this custom film.");
    } finally {
      setRemovingFilmId(null);
    }
  }

  async function updateAdministrator(account: AdminDashboardUser, action: "grant" | "revoke") {
    setRoleMessage("");
    setRolePendingId(account.id);

    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetUserId: account.id })
      });
      const payload = await response.json() as { error?: string; isAdmin?: boolean };
      if (!response.ok || typeof payload.isAdmin !== "boolean") {
        throw new Error(payload.error ?? "Could not update administrator access.");
      }

      setUsers((current) => current.map((user) => user.id === account.id ? { ...user, isAdmin: payload.isAdmin! } : user));
      setStats((current) => ({
        ...current,
        administrators: Math.max(1, current.administrators + (payload.isAdmin ? 1 : -1))
      }));
      setRoleMessage(payload.isAdmin ? `${account.displayName} is now an administrator.` : `${account.displayName} is no longer an administrator.`);
    } catch (error) {
      setRoleMessage(error instanceof Error ? error.message : "Could not update administrator access.");
    } finally {
      setRolePendingId(null);
    }
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar" aria-label="Administration navigation">
        <Link className="admin-brand" href="/" aria-label="Cova home">
          <img src="/assets/Cova-logo-white.svg" alt="Cova" />
          <span>Console</span>
        </Link>
        <nav className="admin-nav">
          <AdminNavButton active={activeTab === "overview"} icon={<LayoutDashboard />} onClick={() => setActiveTab("overview")}>Overview</AdminNavButton>
          <AdminNavButton active={activeTab === "films"} icon={<Film />} onClick={() => setActiveTab("films")}>Film catalog</AdminNavButton>
          <AdminNavButton active={activeTab === "users"} icon={<Users />} onClick={() => setActiveTab("users")}>Users</AdminNavButton>
          <AdminNavButton active={activeTab === "admins"} icon={<ShieldCheck />} onClick={() => setActiveTab("admins")}>Administrators</AdminNavButton>
        </nav>
        <Link className="admin-back-home" href="/">Back to Cova</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>Operations</span>
            <h1>{tabTitle(activeTab)}</h1>
          </div>
          <div className="admin-security-state"><ShieldCheck size={17} /> Server protected</div>
        </header>

        {activeTab === "overview" ? (
          <section className="admin-content" aria-label="Administration overview">
            <div className="admin-metrics">
              <AdminMetric icon={<Users />} label="Accounts" value={stats.users} />
              <AdminMetric icon={<Film />} label="Films" value={stats.films} />
              <AdminMetric icon={<Plus />} label="Custom films" value={stats.customFilms} />
              <AdminMetric icon={<ShieldCheck />} label="Administrators" value={stats.administrators} />
            </div>

            <div className="admin-overview-grid">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span>Catalog</span>
                    <h2>Recent custom films</h2>
                  </div>
                  <button className="admin-text-action" onClick={() => setActiveTab("films")} type="button">Manage catalog</button>
                </div>
                {customFilms.length ? (
                  <div className="admin-film-list">
                    {customFilms.slice(0, 4).map((film) => <AdminFilmRow film={film} key={film.id} />)}
                  </div>
                ) : <AdminEmptyState>No custom films yet.</AdminEmptyState>}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <span>Access</span>
                    <h2>Administrator roles</h2>
                  </div>
                  <button className="admin-text-action" onClick={() => setActiveTab("admins")} type="button">Manage roles</button>
                </div>
                <div className="admin-admin-summary">
                  {administrators.slice(0, 5).map((account) => (
                    <div className="admin-person" key={account.id}>
                      <span>{initials(account.displayName)}</span>
                      <div><strong>{account.displayName}</strong><small>{account.isFounder ? "Founder" : "Administrator"}</small></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeTab === "films" ? (
          <section className="admin-content admin-catalog-layout" aria-label="Custom film catalog">
            <form className="admin-panel admin-film-form" onSubmit={createFilm}>
              <div className="admin-panel-heading">
                <div><span>New entry</span><h2>Add a custom film</h2></div>
              </div>
              <AdminField label="Title"><input className="admin-input" maxLength={160} onChange={(event) => setFilmForm((current) => ({ ...current, title: event.target.value }))} required value={filmForm.title} /></AdminField>
              <div className="admin-field-grid">
                <AdminField label="Release year"><input className="admin-input" inputMode="numeric" maxLength={4} placeholder="2026" onChange={(event) => setFilmForm((current) => ({ ...current, releaseYear: event.target.value }))} value={filmForm.releaseYear} /></AdminField>
                <AdminField label="Runtime (minutes)"><input className="admin-input" inputMode="numeric" max="600" min="1" onChange={(event) => setFilmForm((current) => ({ ...current, runtime: event.target.value }))} value={filmForm.runtime} /></AdminField>
              </div>
              <AdminField label="Poster URL"><input className="admin-input" inputMode="url" placeholder="https://..." onChange={(event) => setFilmForm((current) => ({ ...current, posterPath: event.target.value }))} required value={filmForm.posterPath} /></AdminField>
              <AdminField label="Synopsis"><textarea className="admin-textarea" maxLength={2400} onChange={(event) => setFilmForm((current) => ({ ...current, overview: event.target.value }))} rows={6} value={filmForm.overview} /></AdminField>
              <button className="admin-primary-action" disabled={isCreatingFilm} type="submit">
                {isCreatingFilm ? <LoaderCircle className="admin-button-spinner" /> : <Plus size={17} />}
                Add film
              </button>
              {filmMessage ? <p className="admin-form-message" role="status">{filmMessage}</p> : null}
            </form>

            <section className="admin-panel admin-catalog-panel">
              <div className="admin-panel-heading">
                <div><span>Catalog</span><h2>{customFilms.length} custom films</h2></div>
              </div>
              {customFilms.length ? (
                <div className="admin-film-list admin-film-list-full">
                  {customFilms.map((film) => (
                    <div className="admin-film-row" key={film.id}>
                      <AdminFilmRow film={film} />
                      <button aria-label={`Remove ${film.title}`} className="admin-icon-action danger" disabled={removingFilmId === film.id} onClick={() => void removeFilm(film)} type="button">
                        {removingFilmId === film.id ? <LoaderCircle className="admin-button-spinner" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : <AdminEmptyState>Custom films you add will appear here.</AdminEmptyState>}
            </section>
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section className="admin-content" aria-label="User management">
            <section className="admin-panel admin-table-panel">
              <div className="admin-panel-heading admin-table-heading">
                <div><span>Accounts</span><h2>Users</h2></div>
                <label className="admin-search"><Search size={16} /><input onChange={(event) => setUserQuery(event.target.value)} placeholder="Search name, email, username" value={userQuery} /></label>
              </div>
              <UserTable accounts={visibleUsers} founderCanManage={isFounder} onRoleChange={updateAdministrator} pendingId={rolePendingId} />
              {roleMessage ? <p className="admin-form-message" role="status">{roleMessage}</p> : null}
            </section>
          </section>
        ) : null}

        {activeTab === "admins" ? (
          <section className="admin-content" aria-label="Administrator management">
            <section className="admin-panel admin-table-panel">
              <div className="admin-panel-heading">
                <div><span>Protected roles</span><h2>Administrators</h2></div>
                <small className="admin-helper">Only the founder can grant or revoke this access.</small>
              </div>
              <UserTable accounts={administrators} founderCanManage={isFounder} onRoleChange={updateAdministrator} pendingId={rolePendingId} />
              {roleMessage ? <p className="admin-form-message" role="status">{roleMessage}</p> : null}
            </section>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function AdminNavButton({ active, children, icon, onClick }: { active: boolean; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return <button className={active ? "active" : undefined} onClick={onClick} type="button">{icon}{children}</button>;
}

function AdminMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <article className="admin-metric"><div>{icon}</div><span>{label}</span><strong>{value.toLocaleString()}</strong></article>;
}

function AdminFilmRow({ film }: { film: AdminCatalogMovie }) {
  return <div className="admin-film-summary">
    {film.posterPath ? <img src={film.posterPath} alt="" /> : <div className="admin-film-poster-fallback"><Film size={16} /></div>}
    <div><strong>{film.title}</strong><small>{film.releaseYear ?? "No release year"}</small></div>
  </div>;
}

function AdminField({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}

function AdminEmptyState({ children }: { children: React.ReactNode }) {
  return <p className="admin-empty-state">{children}</p>;
}

function UserTable({
  accounts,
  founderCanManage,
  onRoleChange,
  pendingId
}: {
  accounts: AdminDashboardUser[];
  founderCanManage: boolean;
  onRoleChange: (account: AdminDashboardUser, action: "grant" | "revoke") => void;
  pendingId: string | null;
}) {
  if (!accounts.length) return <AdminEmptyState>No matching accounts.</AdminEmptyState>;

  return <div className="admin-user-table" role="table">
    <div className="admin-user-table-head" role="row"><span>Account</span><span>Joined</span><span>Access</span><span aria-label="Actions" /></div>
    {accounts.map((account) => (
      <div className="admin-user-row" key={account.id} role="row">
        <div className="admin-user-account"><span className="admin-avatar">{initials(account.displayName)}</span><div><strong>{account.displayName}</strong><small>{account.email}{account.username ? ` · @${account.username}` : ""}</small></div></div>
        <span>{formatDate(account.createdAt)}</span>
        <span className={`admin-role-badge${account.isAdmin ? " admin" : ""}`}>{account.isFounder ? "Founder" : account.isAdmin ? "Admin" : "Member"}</span>
        <div className="admin-row-actions">
          <Link href={account.username ? `/${account.username}` : "/"}>View</Link>
          {founderCanManage && !account.isFounder ? (
            <button disabled={pendingId === account.id} onClick={() => onRoleChange(account, account.isAdmin ? "revoke" : "grant")} type="button">
              {pendingId === account.id ? <LoaderCircle className="admin-button-spinner" /> : account.isAdmin ? "Remove admin" : "Make admin"}
            </button>
          ) : null}
        </div>
      </div>
    ))}
  </div>;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "C";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function tabTitle(tab: AdminTab) {
  return ({ overview: "Overview", films: "Film catalog", users: "User management", admins: "Administrator access" })[tab];
}
