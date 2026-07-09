type TurnstileResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(token: string | undefined, request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return {
      ok: process.env.NODE_ENV !== "production",
      error: "Turnstile secret key is not configured."
    };
  }

  if (!token) {
    return { ok: false, error: "Complete the Turnstile check before continuing." };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    formData.append("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });
  const result = (await response.json()) as TurnstileResult;

  if (!result.success) {
    return {
      ok: false,
      error: "Turnstile verification failed. Please try again."
    };
  }

  return { ok: true, error: null };
}
