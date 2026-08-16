import type { CrewState, MapType } from "@the-crew/world-core";
import { worldStore, type ApiUser, type CrewSummary } from "./store.js";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (body.error) {
        message = body.error;
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : undefined) as T;
}

export async function getSession(): Promise<ApiUser | null> {
  try {
    const res = await fetch("/api/auth/get-session");
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as { user?: ApiUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}

export function signUp(body: {
  name: string;
  email: string;
  password: string;
  avatarId: string;
}): Promise<ApiUser> {
  return api<{ user: ApiUser }>("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.user);
}

export function signIn(body: { email: string; password: string }): Promise<ApiUser> {
  return api<{ user: ApiUser }>("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.user);
}

export function signOut(): Promise<void> {
  return api("/api/auth/sign-out", { method: "POST" });
}

export async function refreshCrews(): Promise<void> {
  const body = await api<{ crews: CrewSummary[] }>("/api/crews");
  worldStore.getState().setCrews(body.crews);
}

export function createCrew(name: string, mapType: MapType): Promise<CrewState> {
  return api<{ crew: CrewState }>("/api/crews", {
    method: "POST",
    body: JSON.stringify({ name, mapType }),
  }).then((r) => r.crew);
}

export function getCrew(
  crewId: string,
): Promise<{ crew: CrewState; myInhabitantId: string | null }> {
  return api(`/api/crews/${encodeURIComponent(crewId)}`);
}
