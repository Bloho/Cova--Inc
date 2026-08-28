import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal, Rights & Credits | Cova",
  description: "Cova's legal information, copyright policy, and data-source credits."
};

const updatedAt = "28 August 2026";

export default function CompanyLegalPage() {
  return (
    <main className="company-legal-page">
      <header className="company-legal-header">
        <Link className="company-legal-brand" href="/" aria-label="Cova home">
          <img src="/assets/Cova-logo-white.svg" alt="Cova" />
        </Link>
        <Link className="company-legal-home" href="/">Home</Link>
      </header>

      <article className="company-legal-content">
        <p className="company-legal-eyebrow">Cova by Bloho</p>
        <h1>Legal, rights &amp; credits</h1>
        <p className="company-legal-intro">Cova is a social movie journal for logging films, writing reviews, and sharing your taste with the people you choose.</p>
        <p className="company-legal-updated">Last updated {updatedAt}</p>

        <section>
          <h2>About Cova</h2>
          <p>Cova is operated by Bloho, its parent company. References to “Cova”, “we”, “us”, or “our” mean Cova and Bloho where applicable.</p>
        </section>

        <section>
          <h2>Using Cova</h2>
          <p>Use Cova lawfully and respectfully. Do not interfere with the service, impersonate others, infringe someone else&apos;s rights, or upload unlawful, abusive, deceptive, or harmful material.</p>
          <p>You are responsible for the reviews, profile details, and other material you add to Cova. You keep ownership of your original content, and give Cova a limited, non-exclusive licence to host, display, reproduce, and distribute it only as needed to operate and improve the service.</p>
        </section>

        <section>
          <h2>Copyright &amp; intellectual property</h2>
          <p>The Cova name, product design, code, and original Cova content are owned by Bloho or its licensors and may not be copied, modified, or used without permission. Film titles, posters, stills, cast and crew information, and other third-party materials remain the property of their respective owners.</p>
          <p>If you believe content on Cova infringes your copyright or another right, email <a href="mailto:legal@bloho.space">legal@bloho.space</a> with the relevant URL, your contact details, a description of the work, and a good-faith explanation of the issue. We will review valid requests promptly.</p>
        </section>

        <section className="company-legal-tmdb">
          <div className="company-legal-tmdb-mark">
            <img src="/assets/tmdb-logo.svg" alt="The Movie Database" />
            <span>Film data and imagery</span>
          </div>
          <div>
            <h2>TMDB attribution</h2>
            <p>Cova uses The Movie Database (TMDB) API for film data and imagery.</p>
            <p className="company-legal-tmdb-notice">This product uses the TMDB API but is not endorsed, certified, or otherwise approved by TMDB.</p>
            <p><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">Visit The Movie Database</a> · <a href="https://www.themoviedb.org/api-terms-of-use" target="_blank" rel="noreferrer">TMDB API Terms of Use</a></p>
          </div>
        </section>

        <section>
          <h2>Third-party services</h2>
          <p>Cova relies on third-party infrastructure and service providers to operate. Their services are governed by their own terms and privacy policies. We are not responsible for third-party content, availability, or practices outside Cova.</p>
        </section>

        <section>
          <h2>Changes &amp; contact</h2>
          <p>We may update this page as Cova evolves. Continuing to use Cova after an update means you accept the revised information. For legal or rights-related questions, contact <a href="mailto:legal@bloho.space">legal@bloho.space</a>.</p>
        </section>
      </article>

      <footer className="company-legal-footer">
        <span>© 2026 Bloho. Cova is a Bloho product.</span>
        <a href="mailto:legal@bloho.space">legal@bloho.space</a>
      </footer>
    </main>
  );
}
