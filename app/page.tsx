import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MoviePoster } from "@/components/MoviePoster";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Separator } from "@/components/ui/separator";
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

  const { trending, isLive } = await getHomeMovies();
  const { user, profile } = await getCurrentUserProfile();
  const states = await getUserMovieStates(trending.map((movie) => movie.tmdbId), user?.id);
  const trendingWithState = trending.map((movie) => applyUserState(movie, states.get(movie.tmdbId)));
  const needsOnboarding = Boolean(user && profile && (!profile.username || !profile.onboarded_at));

  return (
    <>
      <Header />
      <main className="site-main">
        <section className="shell hero hero-compact" aria-labelledby="home-title">
          <h1 id="home-title">{user ? `Welcome, ${profile?.display_name ?? user.email}` : "Cova"}</h1>
          <p>Find a film, log it, review it, and share it with your friends!</p>
        </section>

        <section className="shell section" aria-labelledby="trending">
          <h2 id="trending" className="section-head">
            <span>Trending on Cova</span>
            <small>{isLive ? "Hello" : "TMDB seed until key is added"}</small>
          </h2>
          <Separator />
          <div className="poster-row">
            {trendingWithState.map((movie) => (
              <MoviePoster key={movie.tmdbId} movie={movie} isSignedIn={Boolean(user)} />
            ))}
          </div>
        </section>

      </main>
      <Footer />
      {needsOnboarding ? <OnboardingModal initialUsername={profile?.username} /> : null}
    </>
  );
}
