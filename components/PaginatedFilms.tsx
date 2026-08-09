"use client";

import { useState, useMemo } from "react";
import type { Movie } from "@/lib/data";
import { MoviePoster } from "@/components/MoviePoster";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginatedFilmsProps {
  movies: Movie[];
  isSignedIn: boolean;
  itemsPerPage?: number;
  showYears?: boolean;
  showReviewTooltip?: boolean;
}

const ITEMS_PER_PAGE = 28;

export function PaginatedFilms({
  movies,
  isSignedIn,
  itemsPerPage = ITEMS_PER_PAGE,
  showYears = true,
  showReviewTooltip = false,
}: PaginatedFilmsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(movies.length / itemsPerPage);

  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return movies.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, movies, itemsPerPage]);

  const getPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );

      if (start > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
      {paginatedMovies.length ? (
        <div className="poster-grid">
          {paginatedMovies.map((movie) => (
            <MoviePoster
              key={movie.tmdbId}
              movie={movie}
              dense
              isSignedIn={isSignedIn}
              showYear={showYears}
              showTooltip={showReviewTooltip}
              tooltipVariant="profile"
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">No films logged yet.</div>
      )}

      {totalPages > 1 && (
        <Pagination className="profile-pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage((page) => page - 1);
                  }
                }}
              />
            </PaginationItem>

            {getPaginationItems()}

            <PaginationItem>
              <PaginationNext
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage((page) => page + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
