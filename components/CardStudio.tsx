"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cardPalettes } from "@/lib/data";
import { movieCardSvg, profileCardSvg } from "@/lib/cards";

export function CardStudio({ username, filmsCount }: { username: string; filmsCount: number }) {
  const [mode, setMode] = useState<"profile" | "movie">("profile");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const palette = cardPalettes[paletteIndex];

  const svg = useMemo(() => {
    const base = {
      ...palette,
      username,
      films: filmsCount,
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date())
    };

    if (mode === "movie") {
      return movieCardSvg({
        ...base,
        movieTitle: "Scary Movie",
        rating: 5
      });
    }

    return profileCardSvg(base);
  }, [filmsCount, mode, palette, username]);

  function download() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cova-${mode}-card.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card-studio" aria-label="Card studio">
      <div className="studio-controls">
        <div className="section-head">
          <span>Card</span>
        </div>
        <div className="segmented glass">
          <button className={mode === "profile" ? "active" : ""} onClick={() => setMode("profile")}>
            Profile
          </button>
          <button className={mode === "movie" ? "active" : ""} onClick={() => setMode("movie")}>
            Movie
          </button>
        </div>
        <div className="swatches" aria-label="Color variants">
          {cardPalettes.map((item, index) => (
            <button
              key={item.name}
              aria-label={item.name}
              className={`swatch${index === paletteIndex ? " active" : ""}`}
              onClick={() => setPaletteIndex(index)}
              style={{ "--a": item.bg, "--b": item.shape } as React.CSSProperties}
            />
          ))}
        </div>
        <button className="pill-button" onClick={download}>
          <Download size={18} />
          SVG
        </button>
      </div>
      <div className="share-preview" dangerouslySetInnerHTML={{ __html: svg }} />
    </section>
  );
}
