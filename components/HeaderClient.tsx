"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogFilmDialog } from "@/components/LogFilmDialog";
import { SearchMovieDialog } from "@/components/SearchMovieDialog";
import { AccountDropdown } from "@/components/AccountDropdown";

export function HeaderClient({
  isSignedIn,
  username,
  displayName,
  avatarUrl
}: {
  isSignedIn: boolean;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    router.prefetch("/");
    if (username) {
      router.prefetch(`/${username}`);
    }
  }, [router, username]);

  function navigateTo(path: string) {
    window.covaProgressRouteStart?.();
    router.push(path);
  }

  async function signOut() {
    window.covaProgressStart?.();
    await fetch("/api/auth/signout", { method: "POST" });
    router.refresh();
    router.push("/");
    window.setTimeout(() => window.covaProgressDone?.(), 900);
  }

  return (
    <header className="shell app-header">
      <Link href="/" className="brand brand-logo" aria-label="Cova home" prefetch>
        <video autoPlay className="brand-logo-video" loop muted playsInline preload="auto" aria-label="Cova">
          <source src="/assets/Cova-chromatic-animated.webm" type="video/webm" />
        </video>
      </Link>
      <nav className="header-actions" aria-label="Primary">
        <button className="login-button" onClick={() => setLogOpen(true)} aria-label="Log a film">
          <Plus size={18} />
          LOG
        </button>
        <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search movies" type="button">
          <Search size={23} strokeWidth={2.4} />
        </button>
        {isSignedIn ? (
          <AccountDropdown
            username={username}
            displayName={displayName}
            avatarUrl={avatarUrl}
            onNavigate={navigateTo}
            onSignOut={signOut}
          />
        ) : (
          <Link className="icon-button" href="/login" aria-label="Sign in" prefetch>
            <img className="signed-out-profile-icon" src="/icons/profile.svg" alt="" />
          </Link>
        )}
      </nav>
      <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} />
      <SearchMovieDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
