import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="footer">
      <Separator />
      <div className="shell footer-inner">
        <span>© Cova, film data from TMDB</span>
        <div className="footer-credit">
          <span>A product of</span>
          <img src="/assets/BLOHO-FULL-TRADEMARK-WHIT.svg" alt="Bloho" />
        </div>
      </div>
    </footer>
  );
}
