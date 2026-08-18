import type { CrewState, MapType } from "@the-crew/world-core";
import { type ApiUser, type CrewSummary, worldStore } from "./store.js";

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

export function signIn(body: {
  email: string;
  password: string;
}): Promise<ApiUser> {
  return api<{ user: ApiUser }>("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.user);
}

export function signOut(): Promise<void> {
  return api("/api/auth/sign-out", { method: "POST" });
}

export async function signOutAndLeave(): Promise<void> {
  try {
    await signOut();
  } finally {
    worldStore.getState().leaveCrew();
    worldStore.getState().setUser(null);
  }
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

export interface Invite {
  id: string;
  crewId: string;
  token: string;
  revokedAt: string | null;
}

export interface InviteInfo {
  crewId: string;
  crewName: string;
  active: boolean;
}

export function getInviteInfo(token: string): Promise<InviteInfo> {
  return api(`/api/invites/${encodeURIComponent(token)}`);
}

export function joinInvite(
  token: string,
): Promise<{ crew: CrewState; myInhabitantId: string }> {
  return api(`/api/invites/${encodeURIComponent(token)}/join`, {
    method: "POST",
  });
}

export function listInvites(crewId: string): Promise<Invite[]> {
  return api<{ invites: Invite[] }>(
    `/api/crews/${encodeURIComponent(crewId)}/invites`,
  ).then((r) => r.invites);
}

export function createInvite(crewId: string): Promise<Invite> {
  return api<{ invite: Invite }>(
    `/api/crews/${encodeURIComponent(crewId)}/invites`,
    { method: "POST" },
  ).then((r) => r.invite);
}

export function revokeInvite(crewId: string, inviteId: string): Promise<void> {
  return api(
    `/api/crews/${encodeURIComponent(crewId)}/invites/${encodeURIComponent(inviteId)}`,
    { method: "DELETE" },
  );
}
