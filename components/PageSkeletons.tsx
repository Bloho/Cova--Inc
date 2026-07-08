import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const posterSlots = Array.from({ length: 5 });
const reviewSlots = Array.from({ length: 3 });

export function HeaderSkeleton() {
  return (
    <header className="shell app-header">
      <Skeleton className="skeleton-brand" />
      <div className="skeleton-actions" aria-hidden>
        <Skeleton className="skeleton-pill" />
        <Skeleton className="skeleton-circle" />
        <Skeleton className="skeleton-circle" />
      </div>
    </header>
  );
}

export function HomePageSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="site-main">
        <section className="shell hero hero-compact">
          <Skeleton className="skeleton-hero-title" />
          <Skeleton className="skeleton-hero-copy" />
        </section>

        <section className="shell section">
          <div className="section-head skeleton-section-head">
            <Skeleton className="skeleton-section-title" />
            <Skeleton className="skeleton-section-small" />
          </div>
          <Separator />
          <PosterRowSkeleton />
        </section>
      </main>
      <Footer />
    </>
  );
}

export function ProfilePageSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="shell site-main">
        <section className="profile-hero">
          <div className="identity">
            <Skeleton className="avatar" />
            <div className="skeleton-copy-stack">
              <Skeleton className="skeleton-title" />
              <Skeleton className="skeleton-line short" />
              <Skeleton className="skeleton-button" />
            </div>
          </div>
          <div className="stats" aria-hidden>
            <div className="stat">
              <Skeleton className="skeleton-stat-number" />
              <Skeleton className="skeleton-stat-label" />
            </div>
          </div>
          <Skeleton className="skeleton-button profile-card-trigger" />
        </section>

        <Skeleton className="skeleton-tabs" />

        <section className="section">
          <div className="section-head skeleton-section-head">
            <Skeleton className="skeleton-section-title" />
          </div>
          <Separator />
          <ReviewListSkeleton />
        </section>

        <section className="section">
          <div className="section-head skeleton-section-head">
            <Skeleton className="skeleton-section-title wide" />
          </div>
          <Separator />
          <PosterGridSkeleton />
        </section>
      </main>
      <Footer />
    </>
  );
}

export function MoviePageSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="shell site-main">
        <Skeleton className="skeleton-back-link" />
        <section className="movie-detail">
          <Skeleton className="movie-detail-poster" />
          <div className="movie-detail-copy skeleton-copy-stack">
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
        <Separator />
      </main>
      <Footer />
    </>
  );
}

function PosterRowSkeleton() {
  return (
    <div className="poster-row" aria-hidden>
      {posterSlots.map((_, index) => (
        <Skeleton className="skeleton-poster-card" key={index} />
      ))}
    </div>
  );
}

function PosterGridSkeleton() {
  return (
    <div className="poster-grid" aria-hidden>
      {Array.from({ length: 14 }).map((_, index) => (
        <Skeleton className="skeleton-poster-card" key={index} />
      ))}
    </div>
  );
}

function ReviewListSkeleton() {
  return (
    <div className="review-list" aria-hidden>
      {reviewSlots.map((_, index) => (
        <div className="review" key={index}>
          <Skeleton className="mini-poster" />
          <div className="skeleton-copy-stack">
            <Skeleton className="skeleton-line medium" />
            <Skeleton className="skeleton-line" />
          </div>
          <Skeleton className="skeleton-stars" />
        </div>
      ))}
    </div>
  );
}
