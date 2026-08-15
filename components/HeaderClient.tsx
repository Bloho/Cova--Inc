"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Search, UserCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="account-trigger rounded-full" aria-label={displayName ?? "Account"}>
                <Avatar>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? "Profile"} /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-[#0a0a0a] border-[#1a1a1a] text-white rounded-2xl p-3 space-y-1">
              <DropdownMenuGroup className="space-y-1">
                <DropdownMenuItem onSelect={() => navigateTo("/wishlist")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]">
                  <Image src="/assets/wishlist.svg" alt="" width={20} height={20} className="opacity-70" />
                  <span className="text-sm font-medium">Wishlist</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigateTo(isProfilePage ? "/" : profilePath)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]">
                  <Image src="/assets/profile.svg" alt="" width={20} height={20} className="opacity-70" />
                  <span className="text-sm font-medium">{isProfilePage ? "Home" : "Profile"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigateTo("/favourites")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]">
                  <Image src="/assets/favourites.svg" alt="" width={20} height={20} className="opacity-70" />
                  <span className="text-sm font-medium">Favourites</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2 bg-[#2a2a2a]" />
              <DropdownMenuGroup className="space-y-1">
                <DropdownMenuItem onSelect={() => navigateTo("/settings")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]">
                  <Image src="/assets/settings.svg" alt="" width={20} height={20} className="opacity-70" />
                  <span className="text-sm font-medium">Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <div className="pt-1">
                <DropdownMenuItem onSelect={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer bg-[#1a1a1a] hover:bg-[#252525] focus:bg-[#252525] text-[#ff9e9e]">
                  <Image src="/assets/signout.svg" alt="" width={20} height={20} />
                  <span className="text-sm font-medium">Sign out</span>
                </DropdownMenuItem>
              </div>
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