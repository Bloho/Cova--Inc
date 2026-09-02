import { Skeleton } from "@/components/ui/skeleton";

export function ProfileDashboardSkeleton() {
  return (
    <div className="profile-page profile-dashboard-page profile-dashboard-skeleton">
      <div className="profile-dashboard">
        <aside className="profile-rail" aria-label="Loading profile navigation">
          <Skeleton className="profile-skeleton-logo" />
        </aside>

        <main className="profile-dashboard-main" aria-label="Loading profile">
          <header className="profile-sticky-bar">
            <Skeleton className="profile-skeleton-back" />
            <div className="profile-skeleton-header-copy">
              <Skeleton className="profile-skeleton-header-name" />
              <Skeleton className="profile-skeleton-header-count" />
            </div>
          </header>

          <section className="profile-cover">
            <Skeleton className="profile-skeleton-cover" />
            <Skeleton className="profile-skeleton-avatar" />
          </section>

          <section className="profile-overview">
            <div className="profile-skeleton-identity">
              <Skeleton className="profile-skeleton-name" />
              <Skeleton className="profile-skeleton-handle" />
            </div>
            <div className="profile-skeleton-facts">
              <Skeleton />
              <Skeleton />
            </div>
          </section>

          <nav className="profile-tabs" aria-label="Loading profile collections">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton className="profile-skeleton-tab" key={index} />)}
          </nav>

          <section className="profile-review-feed" aria-label="Loading reviews">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="profile-review-row" key={index}>
                <Skeleton className="profile-review-poster" />
                <div className="profile-skeleton-review-copy">
                  <Skeleton className="profile-skeleton-review-meta" />
                  <Skeleton className="profile-skeleton-review-line" />
                  <Skeleton className="profile-skeleton-review-line short" />
                </div>
              </article>
            ))}
          </section>
        </main>

        <aside className="profile-trends" aria-label="Loading trends">
          <section className="profile-trends-card">
            <Skeleton className="profile-skeleton-trends-title" />
            {Array.from({ length: 3 }).map((_, index) => <Skeleton className="profile-skeleton-trend" key={index} />)}
          </section>
        </aside>
      </div>
    </div>
  );
}
