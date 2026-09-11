"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogFilmDialog } from "@/components/LogFilmDialog";
import { SearchMovieDialog } from "@/components/SearchMovieDialog";
import styles from "./table.module.css";

export function BetaActions({ isSignedIn }: { isSignedIn: boolean }) {
  const [logOpen, setLogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <nav className={styles.actions} aria-label="Movie navigation">
        <Button className="movie-log-button" onClick={() => setLogOpen(true)} type="button">
          <img src="/utilities/LOG.svg" alt="Log a film" />
        </Button>
        <Button variant="outline" className="movie-search-button" onClick={() => setSearchOpen(true)} type="button">
          <SearchIcon aria-hidden />
          <span>Search for movies</span>
        </Button>
      </nav>
      <LogFilmDialog open={logOpen} onClose={() => setLogOpen(false)} isSignedIn={isSignedIn} />
      <SearchMovieDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
