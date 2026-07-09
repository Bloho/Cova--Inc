import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Link href="/" className="brand">
          Cova
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
