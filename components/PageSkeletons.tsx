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
            <h1><Skeleton className="skeleton-home-title" /></h1>
            <p><Skeleton className="skeleton-home-copy" /></p>
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
        <section className="profile-hero">
          <div className="identity">
            <Skeleton className="avatar" />

            <div>
              <div aria-hidden>
                <Skeleton className="skeleton-profile-name" />
              </div>

              <div className="handle" aria-hidden>
                <Skeleton className="skeleton-profile-handle" />
              </div>
            </div>
          </div>

          <div className="stats" aria-label="Profile stats">
            <div className="stat">
              <div aria-hidden>
                <Skeleton className="skeleton-profile-stat-number" />
              </div>

              <div aria-hidden>
                <Skeleton className="skeleton-profile-stat-label" />
              </div>
            </div>
          </div>

          <div id="cards" aria-hidden>
            <Skeleton className="skeleton-button profile-card-trigger" />
          </div>
        </section>

        <nav className="tabs" aria-label="Profile tabs">
          <a href="#profile" aria-hidden>
            <Skeleton className="skeleton-profile-tab" />
          </a>

          <a href="#films" aria-hidden>
            <Skeleton className="skeleton-profile-tab" />
          </a>

          <a href="#reviews" aria-hidden>
            <Skeleton className="skeleton-profile-tab" />
          </a>
        </nav>

        <section id="profile" className="section" aria-label="Loading activity">
          <div className="section-head" aria-hidden>
            <Skeleton className="skeleton-profile-section-title" />
          </div>

          <Separator />

          <ReviewListSkeleton />
        </section>

        <section id="films" className="section" aria-label="Loading films">
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

function ReviewListSkeleton() {
  return (
    <div className="review-list" aria-hidden>
      {reviewSlots.map((_, index) => (
        <article className="review" key={index}>
          <Skeleton className="mini-poster" />

          <div>
            <div aria-hidden>
              <Skeleton className="skeleton-profile-review-title" />
            </div>

            <div aria-hidden>
              <Skeleton className="skeleton-profile-review-copy" />
            </div>
          </div>

          <div className="radial-score activity-score user-score">
            <Skeleton className="skeleton-profile-review-score" />
          </div>
        </article>
      ))}
    </div>
  );
}
