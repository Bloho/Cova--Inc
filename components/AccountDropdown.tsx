"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
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
          <DropdownMenuItem onSelect={() => onNavigate("/wishlist")} className="cova-account-item">
            <Image src="/icons/wishlist=false.svg" alt="" width={24} height={24} />
            <span>Wishlist</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              if (isProfilePage) {
                event.preventDefault();
                return;
              }
              onNavigate(profilePath);
            }}
            className="cova-account-item"
          >
            <Image src="/icons/profile.svg" alt="" width={24} height={24} />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onNavigate("/favourites")} className="cova-account-item">
            <Image src="/icons/favourite=false.svg" alt="" width={24} height={24} />
            <span>Favourites</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="cova-account-separator" />
        <DropdownMenuGroup className="cova-account-group">
          <DropdownMenuItem onSelect={keepFutureItemClosed} className="cova-account-item" data-future="true">
            <Image src="/icons/settings.svg" alt="" width={24} height={24} />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="cova-account-separator cova-account-separator-bottom" />
        <DropdownMenuItem onSelect={onSignOut} className="cova-account-item cova-account-signout">
          <Image src="/icons/signout.svg" alt="" width={24} height={24} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
