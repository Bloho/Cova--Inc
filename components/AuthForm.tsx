"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm() {
  const supabase = createSupabaseBrowserClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const onTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const onTurnstileExpire = useCallback(() => setTurnstileToken(""), []);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      setMessage("Complete the Turnstile check before continuing.");
      setBusy(false);
      return;
    }

    const result = await fetch("/api/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        email,
        password,
        displayName,
        turnstileToken
      })
    });
    const data = (await result.json().catch(() => ({}))) as {
      error?: string;
      needsEmailConfirmation?: boolean;
    };

    if (!result.ok) {
      setTurnstileToken("");
      window.turnstile?.reset();
      setMessage(data.error ?? "Could not sign in.");
    } else if (data.needsEmailConfirmation) {
      setMessage("Check your email to confirm your account.");
    } else {
      await fetch("/api/profile/ensure", { method: "POST" });
      window.location.href = "/";
    }

    setBusy(false);
  }

  async function resetPassword() {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl || window.location.origin}/login`
    });

    setMessage(error ? error.message : "Password reset email sent.");
  }

  return (
    <div className="login-form">
      <div className="segmented auth-mode">
        <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>
      <Link className="pill-button secondary" href="/auth/google">
        <img src="/utilities/logo-google.svg" alt="Google logo" className="mr-2 h-4 w-4" />
        <span>Continue with Google</span>
      </Link>
      <form className="login-form" onSubmit={submitEmail}>
        {mode === "signup" ? (
          <input
            className="input"
            type="text"
            placeholder="Display name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        ) : null}
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TurnstileWidget onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />
        <button className="pill-button" type="submit" disabled={busy}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button className="text-button" type="button" onClick={resetPassword}>
        Reset password
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}
