import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer style={{ display: "flex", flexDirection: "column", minHeight: "76px", marginTop: "70px", backgroundColor: "#151515", color: "rgba(255, 255, 255, 0.35)", fontWeight: "700" }}>
      <Separator />
      <div className="shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flex: 1, whiteSpace: "nowrap" }}>
        <span>© Cova, film data from TMDB</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
          <span>A product of</span>
          <img src="/assets/BLOHO-FULL-TRADEMARK-WHIT.svg" alt="Bloho" style={{ height: "20px", width: "auto" }} />
        </div>
      </div>
    </footer>
  );
}
