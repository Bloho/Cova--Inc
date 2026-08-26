"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
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

type AccountDropdownProps = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  triggerClassName?: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
};

export function AccountDropdown({
  username,
  displayName,
  avatarUrl,
  triggerClassName,
  onNavigate,
  onSignOut
}: AccountDropdownProps) {
  const pathname = usePathname();
  const profilePath = username ? `/${username}` : "/";
  const isProfilePage = Boolean(username && pathname === profilePath);
  const initials = getInitials(displayName ?? username ?? "Cova");
  const [highlightedItem, setHighlightedItem] = useState<AccountMenuItem>(() => getActiveItem(pathname, profilePath));

  useEffect(() => {
    setHighlightedItem(getActiveItem(pathname, profilePath));
  }, [pathname, profilePath]);

  function keepFutureItemClosed(event: Event) {
    event.preventDefault();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`account-trigger rounded-full${triggerClassName ? ` ${triggerClassName}` : ""}`}
          aria-label={displayName ?? "Account"}
        >
          <Avatar>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName ?? "Profile"} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="cova-account-menu">
        <DropdownMenuGroup className="cova-account-group">
          <DropdownMenuItem onFocus={() => setHighlightedItem("wishlist")} onPointerMove={() => setHighlightedItem("wishlist")} onSelect={() => onNavigate("/wishlist")} className={`cova-account-item${highlightedItem === "wishlist" ? " is-highlighted" : ""}`}>
            <span className="cova-account-icon" style={{ "--cova-icon": 'url("/icons/wishlist=false.svg")' } as CSSProperties} aria-hidden />
            <span>Wishlist</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onFocus={() => setHighlightedItem("profile")}
            onPointerMove={() => setHighlightedItem("profile")}
            onSelect={(event) => {
              if (isProfilePage) {
                event.preventDefault();
                return;
              }
              onNavigate(profilePath);
            }}
            className={`cova-account-item${highlightedItem === "profile" ? " is-highlighted" : ""}`}
          >
            <span className="cova-account-icon" style={{ "--cova-icon": 'url("/icons/profile.svg")' } as CSSProperties} aria-hidden />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onFocus={() => setHighlightedItem("favourites")} onPointerMove={() => setHighlightedItem("favourites")} onSelect={() => onNavigate("/favourites")} className={`cova-account-item${highlightedItem === "favourites" ? " is-highlighted" : ""}`}>
            <span className="cova-account-icon" style={{ "--cova-icon": 'url("/icons/favourite=false.svg")' } as CSSProperties} aria-hidden />
            <span>Favourites</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="cova-account-separator" />
        <DropdownMenuGroup className="cova-account-group">
          <DropdownMenuItem onFocus={() => setHighlightedItem("settings")} onPointerMove={() => setHighlightedItem("settings")} onSelect={keepFutureItemClosed} className={`cova-account-item${highlightedItem === "settings" ? " is-highlighted" : ""}`} data-future="true">
            <span className="cova-account-icon" style={{ "--cova-icon": 'url("/icons/settings.svg")' } as CSSProperties} aria-hidden />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="cova-account-separator cova-account-separator-bottom" />
        <DropdownMenuItem onFocus={() => setHighlightedItem("signout")} onPointerMove={() => setHighlightedItem("signout")} onSelect={onSignOut} className={`cova-account-item cova-account-signout${highlightedItem === "signout" ? " is-highlighted" : ""}`}>
          <Image src="/icons/signout.svg" alt="" width={24} height={24} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type AccountMenuItem = "wishlist" | "profile" | "favourites" | "settings" | "signout" | null;

function getActiveItem(pathname: string, profilePath: string): AccountMenuItem {
  if (pathname === "/wishlist") return "wishlist";
  if (pathname === profilePath) return "profile";
  if (pathname === "/favourites") return "favourites";
  return null;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CV";
}
