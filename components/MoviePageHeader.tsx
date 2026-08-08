"use client";

import Link from "next/link";
import { BadgeCheckIcon, CreditCardIcon, HomeIcon, LogOutIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LogFilmDialog } from "@/components/LogFilmDialog";
import { SearchMovieDialog } from "@/components/SearchMovieDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function MoviePageHeader({
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
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profilePath = username ? `/${username}` : "/";
  const isProfilePage = pathname === profilePath;

  useEffect(() => setMounted(true), []);

  function navigateTo(path: string) {
    window.covaProgressRouteStart?.();
    router.push(path);
  }

  function openCards() {
    window.sessionStorage.setItem("cova-open-profile-card", "1");
    navigateTo(`${profilePath}#cards`);
  }

  async function signOut() {
    window.covaProgressStart?.();
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initials = getInitials(displayName ?? username ?? "Cova");

  return (
    <header className="movie-page-header">
      <Link href="/" className="movie-page-brand" aria-label="Cova home">
        <img src="/assets/Cova-logo-white.svg" alt="Cova" />
      </Link>
      <nav className="movie-page-nav" aria-label="Movie page navigation">
        <Button className="movie-log-button" onClick={() => setLogOpen(true)} type="button">
          <img src="/assets/+ LOG.svg" alt="Log a film" />
        </Button>
        <Button variant="outline" className="movie-search-button" onClick={() => setSearchOpen(true)} type="button">
          <SearchIcon aria-hidden />
          <span>Search for movies</span>
        </Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="movie-avatar-button" aria-label={displayName ?? "Account"}>
                <Avatar>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? "Profile"} /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => navigateTo(isProfilePage ? "/" : profilePath)}>
                  {isProfilePage ? <HomeIcon /> : <BadgeCheckIcon />}
                  {isProfilePage ? "Home" : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openCards}>
                  <CreditCardIcon />
                  Cards
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="icon" className="movie-avatar-button" aria-label="Sign in">
            <Link href="/login"><BadgeCheckIcon aria-hidden /></Link>
          </Button>
        )}
      </nav>
      <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} />
      <SearchMovieDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CV";
}
