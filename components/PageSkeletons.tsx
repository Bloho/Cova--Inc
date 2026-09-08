import { ProfileDashboardSkeleton } from "@/components/ProfileDashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const posterSlots = Array.from({ length: 5 });

export function HeaderSkeleton({ moviePage = false, hidePrimaryActions = false }: { moviePage?: boolean; hidePrimaryActions?: boolean } = {}) {
  if (moviePage) {
    return (
      <header className="movie-page-header" aria-label="Loading navigation">
        <div className="movie-page-brand" aria-label="Cova">
          <Skeleton className="skeleton-movie-brand" />
        </div>
        <nav className="movie-page-nav" aria-hidden>
          {!hidePrimaryActions ? (
            <>
              <Skeleton className="skeleton-movie-log" />
              <Skeleton className="skeleton-movie-search" />
            </>
          ) : null}
          <Skeleton className="skeleton-movie-control" />
          <Skeleton className="skeleton-movie-avatar" />
        </nav>
      </header>
    );
  }

  return (
    <header className="shell app-header" aria-label="Loading navigation">
      <div className="brand brand-logo" aria-label="Cova">
        <img src="/assets/Cova-logo-white.svg" alt="Cova" width={188} height={62} />
      </div>
      <nav className="header-actions" aria-hidden>
        <Skeleton className="skeleton-button" />
        <Skeleton className="skeleton-icon" />
        <Skeleton className="skeleton-icon" />
      </nav>
    </header>
  );
}

export function RoutePageSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="shell site-main route-page-skeleton" aria-label="Loading page">
        <Skeleton className="skeleton-movie-title" />
        <Skeleton className="skeleton-paragraph" />
      </main>
    </>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="home-page">
      <HeaderSkeleton moviePage />
      <main className="site-main">
        <section className="shell hero hero-compact" aria-label="Loading homepage">
          <div className="home-hero-content" aria-hidden>
            <Skeleton className="skeleton-home-title" />
            <Skeleton className="skeleton-home-copy" />
          </div>
        </section>

        <section className="shell section" aria-label="Loading trending movies">
          <PosterRowSkeleton />
        </section>
      </main>

      <footer className="movie-page-footer home-page-footer" aria-label="Loading footer">
        <Skeleton className="skeleton-footer-copy" />
        <div><Skeleton className="skeleton-footer-copy short" /><Skeleton className="skeleton-footer-copy short" /></div>
      </footer>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return <ProfileDashboardSkeleton />;
}

export function MoviePageSkeleton() {
  return (
    <div className="movie-page">
      <HeaderSkeleton moviePage />
      <main className="movie-page-main">
        <div className="movie-page-top-space" aria-hidden />
        <section className="movie-page-feature">
          <div className="movie-page-poster">
            <Skeleton className="skeleton-movie-poster" />
          </div>
          <div className="movie-page-copy skeleton-movie-copy">
            <div className="movie-page-meta skeleton-movie-meta" aria-hidden>
              <Skeleton className="skeleton-movie-year" />
              <Skeleton className="skeleton-movie-director" />
            </div>

            <div className="skeleton-movie-heading" aria-hidden>
              <Skeleton className="skeleton-movie-heading-line" />
              <Skeleton className="skeleton-movie-heading-line short" />
            </div>

            <SkeletonText className="skeleton-movie-overview" />

            <div className="movie-collection-actions skeleton-collection-actions" aria-hidden>
              <Skeleton className="skeleton-collection-button" />
              <Skeleton className="skeleton-collection-button" />
            </div>

            <div className="movie-page-actions skeleton-rating-actions" aria-hidden>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton className="skeleton-movie-star" key={index} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="movie-page-footer" aria-label="Loading footer">
        <Skeleton className="skeleton-footer-copy" />
        <div><Skeleton className="skeleton-footer-copy short" /><Skeleton className="skeleton-footer-copy short" /></div>
      </footer>
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-text", className)} aria-hidden>
      <Skeleton className="skeleton-text-line" />
      <Skeleton className="skeleton-text-line" />
      <Skeleton className="skeleton-text-line short" />
    </div>
  );
}

function PosterRowSkeleton() {
  return (
    <div className="poster-row" aria-hidden>
      {posterSlots.map((_, index) => (
        <article className="poster-card" key={index}>
          <a className="poster-link" aria-hidden tabIndex={-1}>
            <Skeleton className="poster-image" />
          </a>
          <div className="poster-meta">
            <Skeleton className="skeleton-home-poster-meta" />
          </div>
        </article>
      ))}
    </div>
  );
}
