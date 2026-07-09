"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon, CreditCardIcon, HomeIcon, LogOutIcon, Plus, Search, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  const pathname = usePathname();
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profilePath = username ? `/${username}` : "/";
  const isProfilePage = Boolean(username && pathname === `/${username}`);
  const initials = getInitials(displayName ?? username ?? "Cova");

  function navigateTo(path: string) {
    window.covaProgressRouteStart?.();
    router.push(path);
  }

  function openCards() {
    if (isProfilePage) {
      window.dispatchEvent(new CustomEvent("cova-open-profile-card"));
      return;
    }

    window.sessionStorage.setItem("cova-open-profile-card", "1");
    navigateTo(`${profilePath}#cards`);
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
        <Image src="/assets/Cova-logo-white.svg" alt="Cova" width={188} height={62} priority />
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="account-trigger rounded-full" aria-label={displayName ?? "Account"}>
                  <Avatar>
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? "Profile"} /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
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
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link className="icon-button" href="/login" aria-label="Sign in" prefetch>
            <UserCircle size={25} strokeWidth={2.4} />
          </Link>
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
