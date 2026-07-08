import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="footer">
      <Separator />
      <div className="shell" style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
        <span>© Cova, film data from TMDB</span>
        <span>Made with love by Boho</span>
      </div>
    </footer>
  );
}
