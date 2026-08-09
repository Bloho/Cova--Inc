import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const posterSlots = Array.from({ length: 5 });
const reviewSlots = Array.from({ length: 3 });

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
  return (
    <div className="profile-page">
      <HeaderSkeleton moviePage hidePrimaryActions />

      <main className="profile-main">
        <section className="profile-page-hero" aria-label="Loading profile">
          <div className="profile-page-identity">
            <Skeleton className="profile-page-avatar" />

            <div className="profile-page-details" aria-hidden>
              <Skeleton className="skeleton-profile-name" />
              <Skeleton className="skeleton-profile-handle" />
            </div>
          </div>

          <div className="profile-page-actions" aria-label="Loading profile stats">
            <div className="profile-page-stat" aria-hidden>
              <Skeleton className="skeleton-profile-stat-number" />
              <Skeleton className="skeleton-profile-stat-label" />
            </div>

            <div id="cards" aria-hidden>
              <Skeleton className="skeleton-button profile-card-trigger" />
            </div>
          </div>
        </section>

        <section id="profile" className="profile-reviews" aria-label="Loading recent reviews">
          <div className="profile-reviews-heading" role="heading" aria-level={2} aria-hidden>
            <Skeleton className="skeleton-profile-reviews-heading" />
          </div>

          <ProfileReviewsSkeleton />
        </section>

        <section id="films" className="section profile-films" aria-label="Loading films">
          <div className="section-head" aria-hidden>
            <Skeleton className="skeleton-profile-section-title wide" />
          </div>

          <Separator />

          <PosterGridSkeleton />
        </section>
      </main>

      <Footer />
    </div>
  );
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
          <div className="movie-page-copy skeleton-copy-stack">
            <Skeleton className="skeleton-line short" />
            <Skeleton className="skeleton-movie-title" />
            <Skeleton className="skeleton-paragraph" />
            <div className="movie-log-panel" aria-hidden>
              <Skeleton className="skeleton-rating" />
              <Skeleton className="skeleton-button" />
              <Skeleton className="skeleton-button" />
            </div>
            <div className="movie-average-rating" aria-hidden>
              <Skeleton className="skeleton-average-ring" />
              <strong>Average rating by users</strong>
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

function PosterGridSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "48px" }} aria-hidden>
      <div className="poster-grid">
        {Array.from({ length: 14 }).map((_, index) => (
          <article className="poster-card" key={index}>
            <a className="poster-link" tabIndex={-1}>
              <Skeleton className="poster-image" />
            </a>
            <div className="poster-meta">
              <Skeleton className="skeleton-home-poster-meta" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfileReviewsSkeleton() {
  return (
    <div className="profile-reviews-list" aria-hidden>
      {reviewSlots.map((_, index) => (
        <article className="profile-review" key={index}>
          <Skeleton className="profile-review-poster" />

          <div className="profile-review-copy">
            <Skeleton className="skeleton-profile-review-date" />
            <Skeleton className="skeleton-profile-review-quote" />
            <Skeleton className="skeleton-profile-review-movie" />
          </div>
        </article>
      ))}
    </div>
  );
}
