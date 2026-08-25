"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm() {
  const supabase = createSupabaseBrowserClient();
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

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setMessage("");
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
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
      redirectTo: `${window.location.origin}/login`,
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
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
          captcha_token: turnstileToken
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
    <form className="flex flex-col gap-6" onSubmit={submitEmail}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : "Login to your account"}
          </h1>
          <FieldDescription>
            {mode === "signup" ? "Set up your Cova account below" : "Enter your email below to login to your account"}
          </FieldDescription>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "signin" ? "default" : "outline"} onClick={() => changeMode("signin")}>
            Sign in
          </Button>
          <Button type="button" variant={mode === "signup" ? "default" : "outline"} onClick={() => changeMode("signup")}>
            Sign up
          </Button>
        </div>

        {mode === "signup" ? (
          <Field>
            <FieldLabel htmlFor="display-name">Display name</FieldLabel>
            <Input
              id="display-name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Button className="ml-auto h-auto p-0 text-sm underline-offset-4 hover:underline" variant="link" type="button" onClick={resetPassword} disabled={busy || !turnstileToken}>
              Forgot your password?
            </Button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field>
          <TurnstileWidget onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />
        </Field>

        <Field>
          <Button type="submit" disabled={busy || !turnstileToken}>
            {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
          </Button>
        </Field>

        <FieldSeparator>Or continue with</FieldSeparator>

        <Field>
          <Button variant="outline" type="button" onClick={signInWithGoogle} disabled={busy || !turnstileToken}>
            <img src="/utilities/logo-google.svg" alt="" className="size-4" />
            Continue with Google
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <Button className="h-auto p-0 underline underline-offset-4" variant="link" type="button" onClick={() => changeMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Sign in" : "Sign up"}
            </Button>
          </div>
        </Field>

        {message ? <div className="text-center text-sm text-muted-foreground" role="status">{message}</div> : null}
      </FieldGroup>
    </form>
  );
}
