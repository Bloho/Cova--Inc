import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="footer">
      <Separator />
      <div className="shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <span>© Cova, film data from TMDB</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>A product of</span>
          <img src="/assets/BLOHO-FULL-TRADEMARK-WHIT.svg" alt="Bloho" style={{ height: "20px", width: "auto" }} />
        </div>
      </div>
    </footer>
  );
}
