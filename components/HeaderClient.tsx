"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import { LogFilmDialog } from "@/components/LogFilmDialog";

export function HeaderClient({
  isSignedIn,
  username,
  displayName
}: {
  isSignedIn: boolean;
  username: string | null;
  displayName: string | null;
}) {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <header className="shell app-header">
      <Link href="/" className="brand brand-logo" aria-label="Cova home">
        <Image src="/assets/Cova-logo-white.svg" alt="Cova" width={188} height={62} priority />
      </Link>
      <nav className="header-actions" aria-label="Primary">
        <button className="login-button" onClick={() => setLogOpen(true)} aria-label="Log a film">
          <Plus size={18} />
          LOG
        </button>
        <Link className="icon-button" href="/?search=1" aria-label="Search movies">
          <Search size={23} strokeWidth={2.4} />
        </Link>
        <Link className="icon-button" href={isSignedIn ? (username ? `/${username}` : "/") : "/login"} aria-label={displayName ?? "Account"}>
          <UserCircle size={25} strokeWidth={2.4} />
        </Link>
      </nav>
      <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} />
    </header>
  );
}
