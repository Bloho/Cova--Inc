import { redirect } from "next/navigation";
import Link from "next/link";
import { HomeGreeting } from "@/components/HomeGreeting";
import { MoviePoster } from "@/components/MoviePoster";
import { MoviePageHeader } from "@/components/MoviePageHeader";
import { OnboardingModal } from "@/components/OnboardingModal";
import { applyUserState, getCurrentUserProfile, getUserMovieStates } from "@/lib/library";
import { getHomeMovies } from "@/lib/tmdb";

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  if (params?.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=/`);
  }

  const { trending } = await getHomeMovies();
  const { user, profile } = await getCurrentUserProfile();
  const states = await getUserMovieStates(trending.map((movie) => movie.tmdbId), user?.id);
  const trendingWithState = trending.map((movie) => applyUserState(movie, states.get(movie.tmdbId)));
  const needsOnboarding = Boolean(user && profile && (!profile.username || !profile.onboarded_at));

  return (
    <div className="home-page">
      <MoviePageHeader
        isSignedIn={Boolean(user)}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? user?.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="site-main">
        <section className="shell hero hero-compact" aria-labelledby="home-title">
          <video className="home-hero-video" autoPlay loop muted playsInline preload="metadata" aria-hidden>
            <source src="/assets/hero.mp4" type="video/mp4" />
          </video>
          <div className="home-hero-content">
            <h1 id="home-title">
              <HomeGreeting username={user ? profile?.username ?? profile?.display_name ?? user.email ?? "Cova" : null} />
            </h1>
            <p>Explore what&apos;s been popular on Cova</p>
          </div>
        </section>

        <section className="shell section" aria-label="Popular films on Cova">
          <div className="poster-row">
            {trendingWithState.map((movie) => (
              <MoviePoster key={movie.tmdbId} movie={movie} isSignedIn={Boolean(user)} showYear={false} showTooltip />
            ))}
          </div>
        </section>

      </main>
      <footer className="movie-page-footer home-page-footer">
        <span>© Cova by Bloho, 2026</span>
        <div><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>
      </footer>
      {needsOnboarding ? <OnboardingModal initialUsername={profile?.username} /> : null}
    </div>
  );
}
