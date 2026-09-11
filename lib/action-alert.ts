export type ActionAlert = { id: string; stage: "loading" | "success" | "error"; message: string };

function publish(alert: ActionAlert) {
  window.dispatchEvent(new CustomEvent<ActionAlert>("cova:action-alert", { detail: alert }));
}

export async function fetchWithAlert(url: string, options: RequestInit, messages: { loading: string; success: string; error: string }) {
  const id = crypto.randomUUID();
  publish({ id, stage: "loading", message: messages.loading });
  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(30000) });
  } catch {
    response = Response.json({ error: "Connection failed. Please try again." }, { status: 503 });
  }
  publish({ id, stage: response.ok ? "success" : "error", message: response.ok ? messages.success : messages.error });
  return response;
}
