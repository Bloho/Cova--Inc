"use client";

import Link from "next/link";
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LogFilmDialog } from "@/components/LogFilmDialog";
import { SearchMovieDialog } from "@/components/SearchMovieDialog";
import { AccountDropdown } from "@/components/AccountDropdown";
import { Button } from "@/components/ui/button";

export function MoviePageHeader({
  isSignedIn,
  username,
  displayName,
  avatarUrl,
  hasCovaPro = false,
  hidePrimaryActions = false
}: {
  isSignedIn: boolean;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  hasCovaPro?: boolean;
  hidePrimaryActions?: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  function navigateTo(path: string) {
    window.covaProgressRouteStart?.();
    router.push(path);
  }

  async function signOut() {
    window.covaProgressStart?.();
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="movie-page-header" data-signed-in={isSignedIn}>
      <div className="movie-page-brand-group">
        <Link href="/" className="movie-page-brand" aria-label="Cova home">
          {hasCovaPro ? (
            <video autoPlay className="movie-page-brand-video" loop muted playsInline preload="auto" aria-label="Cova">
              <source src="/assets/Cova-chromatic-animated.webm" type="video/webm" />
            </video>
          ) : (
            <img className="movie-page-brand-static" src="/assets/Cova-logo-white.svg" alt="Cova" />
          )}
          <img className="movie-page-sidebar-brand" src="/assets/Cova-logo-white.svg" alt="Cova" />
        </Link>
      </div>
      <nav className="movie-page-nav" aria-label="Movie page navigation">
        {!hasCovaPro ? (
          <Link className="get-cova-pro-button" href="/billing" aria-label="Get Cova Pro">
            <video autoPlay className="get-cova-pro-video" loop muted playsInline preload="auto" aria-hidden>
              <source src="/assets/get-cova-pro.webm" type="video/webm" />
            </video>
          </Link>
        ) : null}
        {!hidePrimaryActions ? (
          <>
            <Button className="movie-log-button" onClick={() => setLogOpen(true)} type="button">
              <img src="/utilities/LOG.svg" alt="Log a film" />
            </Button>
            <Button variant="outline" className="movie-search-button" onClick={() => setSearchOpen(true)} type="button">
              <SearchIcon aria-hidden />
              <span>Search for movies</span>
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          className="movie-theme-button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          type="button"
          aria-label="Toggle color theme"
        >
          {mounted && resolvedTheme === "dark" ? <MoonIcon aria-hidden /> : <SunIcon aria-hidden />}
        </Button>
        {isSignedIn ? (
          <AccountDropdown
            username={username}
            displayName={displayName}
            avatarUrl={avatarUrl}
            triggerClassName="movie-avatar-button"
            onNavigate={navigateTo}
            onSignOut={signOut}
          />
        ) : (
          <Button asChild variant="outline" size="icon" className="movie-avatar-button" aria-label="Sign in">
            <Link href="/login"><img className="signed-out-profile-icon" src="/icons/profile.svg" alt="" /></Link>
          </Button>
        )}
      </nav>
      {!hidePrimaryActions ? <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} /> : null}
      {!hidePrimaryActions ? <SearchMovieDialog open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}
    </header>
  );
}
