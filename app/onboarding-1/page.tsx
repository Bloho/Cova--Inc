import Link from "next/link";
import { HomeGreeting } from "@/components/HomeGreeting";
import { MoviePoster } from "@/components/MoviePoster";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { OnboardingModal } from "@/components/OnboardingModal";
import { getHomeMovies } from "@/lib/tmdb";

export default async function OnboardingPreviewPage() {
  const { trending } = await getHomeMovies();

  return (
    <div className="home-page">
      <MoviePageHeader isSignedIn={false} username={null} displayName={null} avatarUrl={null} />
      <main className="site-main">
        <section className="shell hero hero-compact" aria-labelledby="onboarding-preview-title">
          <video className="home-hero-video" autoPlay loop muted playsInline preload="metadata" aria-hidden>
            <source src="/assets/hero.mp4" type="video/mp4" />
          </video>
          <div className="home-hero-content">
            <h1 id="onboarding-preview-title"><HomeGreeting username="Cova" /></h1>
            <p>Explore what&apos;s been popular on Cova</p>
          </div>
        </section>
        <section className="shell section" aria-label="Popular films on Cova">
          <div className="poster-row">
            {trending.map((movie) => <MoviePoster key={movie.tmdbId} movie={movie} isSignedIn={false} showYear={false} showTooltip />)}
          </div>
        </section>
      </main>
      <footer className="movie-page-footer home-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/company/legal">Legal</Link></div>
      </footer>
      <OnboardingModal demo initialUsername="cova" initialDisplayName="Cova" />
    </div>
  );
}
