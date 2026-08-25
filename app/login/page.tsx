import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-svh font-[family-name:'PP_Neue_Montreal'] lg:grid-cols-2">
      <section className="flex flex-col gap-4 p-6 md:p-10">
        <Link href="/" className="inline-flex w-fit items-center" aria-label="Cova home">
          <img src="/assets/Cova-logo-white.svg" alt="Cova logo" className="h-10 w-auto invert dark:invert-0" />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <AuthForm />
          </div>
        </div>
      </section>
      <section className="relative hidden bg-muted lg:block" aria-label="Cova movie card preview">
        <img
          src="/assets/log-in-banner.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover dark:brightness-[0.35] dark:grayscale"
        />
      </section>
    </main>
  );
}
