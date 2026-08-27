"use client";

import { useEffect, useState } from "react";
import type { LimitedFeature } from "@/lib/upgrade-prompt";

const copy: Record<LimitedFeature, { title: string; body: string }> = {
  reviews: {
    title: "Don't stop at five!",
    body: "You've written your first 5 reviews. Upgrade to Cova Pro to keep sharing your thoughts on every film."
  },
  wishlist: {
    title: "Don't stop at five!",
    body: "You've saved your first 5 movies to your wishlist. Upgrade to Cova Pro to keep building your collection."
  },
  favourites: {
    title: "Don't stop at five!",
    body: "You've picked your first 5 favourites. Upgrade to Cova Pro to keep collecting the films you love."
  },
  movie_share_card: {
    title: "Don't stop at five!",
    body: "You've created 5 share cards for this movie. Upgrade to Cova Pro to keep making more."
  },
  profile_card_export: {
    title: "Don't stop at five!",
    body: "You've exported your first 5 profile cards. Upgrade to Cova Pro to keep sharing your Cova profile."
  }
};

export function UpgradePrompt() {
  const [feature, setFeature] = useState<LimitedFeature | null>(null);

  useEffect(() => {
    const open = (event: Event) => setFeature((event as CustomEvent<LimitedFeature>).detail);
    window.addEventListener("cova-upgrade-required", open);
    return () => window.removeEventListener("cova-upgrade-required", open);
  }, []);

  if (!feature) return null;
  const content = copy[feature];

  return (
    <div className="upgrade-prompt-backdrop" role="dialog" aria-modal="true" aria-labelledby="upgrade-prompt-title">
      <section className="upgrade-prompt">
        <div className="upgrade-prompt-arc" aria-hidden />
        <video autoPlay className="upgrade-prompt-logo" loop muted playsInline>
          <source src="/assets/Cova-chromatic-animated.webm" type="video/webm" />
        </video>
        <div className="upgrade-prompt-copy">
          <h2 id="upgrade-prompt-title">{content.title}</h2>
          <p>{content.body}</p>
        </div>
        <a className="upgrade-prompt-action" href="/billing">Get Cova Pro for Rs99/month</a>
        <button className="upgrade-prompt-dismiss" onClick={() => setFeature(null)} type="button">Maybe later</button>
        <div className="upgrade-prompt-cards" aria-hidden>
          <img className="upgrade-prompt-card first" src="/assets/vertical-card-preview.svg" alt="" />
          <img className="upgrade-prompt-card second" src="/assets/square-card-preview.svg" alt="" />
          <img className="upgrade-prompt-card third" src="/assets/horizontal-card-preview.svg" alt="" />
        </div>
      </section>
    </div>
  );
}
