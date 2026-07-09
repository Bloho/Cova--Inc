import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Link href="/" className="brand" aria-label="Cova home">
          <img src="/assets/Cova-logo-white.svg" alt="Cova logo" className="h-6 w-auto" />
        </Link>
        <div>
          <h1>Sign in to Cova</h1>
          <p className="handle">cova.bloho.xyz</p>
        </div>
        <AuthForm />
      </section>
      <section className="login-media" aria-label="Cova movie card preview" />
    </main>
  );
}
