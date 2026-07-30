"use client";

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
  const onTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setMessage("");
  }, []);
  const onTurnstileExpire = useCallback(() => setTurnstileToken(""), []);

  function refreshTurnstile() {
    setTurnstileToken("");
    window.turnstile?.reset();
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (!turnstileToken) {
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
      refreshTurnstile();
      setMessage(data.error ?? "Could not sign in.");
    } else if (data.needsEmailConfirmation) {
      refreshTurnstile();
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

    if (!turnstileToken) {
      setMessage("Complete the Turnstile check before continuing.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl || window.location.origin}/login`,
      captchaToken: turnstileToken
    });

    refreshTurnstile();
    setMessage(error ? error.message : "Password reset email sent.");
    setBusy(false);
  }

  async function signInWithGoogle() {
    if (!turnstileToken) {
      setMessage("Complete the Turnstile check before continuing.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl || window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error || !data.url) {
      refreshTurnstile();
      setMessage(error?.message ?? "Google sign-in is not configured.");
      setBusy(false);
      return;
    }

    window.location.assign(data.url);
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
      <button className="pill-button secondary" type="button" onClick={signInWithGoogle} disabled={busy || !turnstileToken}>
        <img src="/utilities/logo-google.svg" alt="Google logo" className="mr-2 h-4 w-4" />
        <span>Continue with Google</span>
      </button>
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
        <button className="pill-button" type="submit" disabled={busy || !turnstileToken} style={{ backgroundColor: "#00AF1F", color: "white" }}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button className="text-button" type="button" onClick={resetPassword} disabled={busy || !turnstileToken}>
        Reset password
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}
