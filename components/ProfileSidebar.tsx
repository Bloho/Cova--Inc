"use client";

import Link from "next/link";
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { LogFilmDialog } from "@/components/LogFilmDialog";
import { SearchMovieDialog } from "@/components/SearchMovieDialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ProfileSidebar({ isSignedIn }: { isSignedIn: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <aside className="profile-rail" aria-label="Profile navigation">
      <div className="profile-rail-top">
        <div className="profile-rail-actions">
          <Link className="profile-rail-logo" href="/" aria-label="Cova home">
            <img src="/assets/Cova-logo-white.svg" alt="Cova" />
          </Link>
          <Button className="profile-rail-log-button" onClick={() => setLogOpen(true)} type="button">
            <img src="/utilities/LOG.svg" alt="Log a film" />
          </Button>
        </div>
        <Button className="profile-rail-search-button" onClick={() => setSearchOpen(true)} type="button">
          <SearchIcon aria-hidden />
          <span>Search for movies</span>
        </Button>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="profile-rail-theme-button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        type="button"
        aria-label="Toggle color theme"
      >
        {mounted && resolvedTheme === "dark" ? <MoonIcon aria-hidden /> : <SunIcon aria-hidden />}
      </Button>
      <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} />
      <SearchMovieDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </aside>
  );
}
