// Shared client for talking to the Aegis gateway (see /gateway). Used by
// both the full instrument (AegisGatewaySimulator) and the lighter-weight
// quick-try widget, so the two never drift out of sync on how a request
// actually gets made.
//
// Override with NEXT_PUBLIC_GATEWAY_URL when the backend runs somewhere
// other than localhost:8420. There is no production deployment of the
// Python service — "Live Backend" only works when a visitor (or you,
// locally) is running `uvicorn main:app --port 8420` alongside the
// Next.js dev server.
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8420";

// Every request carries a per-browser team_id so concurrent visitors to this
// public demo get their own rate-limit bucket instead of all sharing
// "default_team" — without this, one person mashing a button could exhaust
// the shared budget/RPM and make the demo appear broken for everyone else
// looking at it at the same time.
export function getVisitorTeamId(): string {
  const STORAGE_KEY = "aegis_demo_visitor_id";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `visitor-${crypto.randomUUID()}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-page-load id
    // rather than silently collapsing everyone back into "default_team".
    return `visitor-${Math.random().toString(36).slice(2)}`;
  }
}

export async function postJSON(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.detail?.error?.message ||
      `Gateway returned HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function getJSON(path: string) {
  const res = await fetch(`${GATEWAY_URL}${path}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gateway returned HTTP ${res.status}`);
  }
  return data;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function formatParamCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString();
}

export async function checkGatewayHealth(timeoutMs = 2500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${GATEWAY_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
