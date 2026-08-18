import type { CrewState } from "@the-crew/world-core";
import { useEffect, useState } from "react";
import { getCrew, getInviteInfo, type InviteInfo, joinInvite } from "../api.js";
import { worldStore } from "../store.js";

export function InviteScreen({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    getInviteInfo(token)
      .then((i) => {
        if (!cancelled) {
          setInfo(i);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown invite link");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function enterCrew(crew: CrewState, myInhabitantId: string) {
    window.history.replaceState(null, "", "/");
    worldStore.getState().applySnapshot(crew, myInhabitantId);
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const { crew, myInhabitantId } = await joinInvite(token);
      enterCrew(crew, myInhabitantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join crew");
      setBusy(false);
    }
  }

  async function reEnter() {
    if (!info) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { crew, myInhabitantId } = await getCrew(info.crewId);
      if (!myInhabitantId) {
        throw new Error("you are not a member of this crew yet");
      }
      enterCrew(crew, myInhabitantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enter crew");
      setBusy(false);
    }
  }

  return (
    <div className="crew-screen">
      <div className="card">
        <h1>{info ? `Join ${info.crewName}` : "You're invited"}</h1>
        {info?.active && (
          <p className="tagline">
            {info.crewName} has room for one more. Grab a spot on the map.
          </p>
        )}
        {info && !info.active && (
          <p className="tagline">
            This invite link has been revoked by the host.
          </p>
        )}
        {info?.active && (
          <>
            <button type="button" onClick={() => void join()} disabled={busy}>
              {busy ? "Joining…" : "Join crew"}
            </button>
            {error && (
              <button
                type="button"
                onClick={() => void reEnter()}
                disabled={busy}
              >
                Enter instead — I'm already a member
              </button>
            )}
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
