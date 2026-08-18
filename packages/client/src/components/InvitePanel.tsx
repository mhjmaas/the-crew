import { useEffect, useState } from "react";
import {
  createInvite,
  type Invite,
  listInvites,
  revokeInvite,
} from "../api.js";
import { inviteUrl } from "../invite.js";

export function InvitePanel({ crewId }: { crewId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listInvites(crewId)
      .then((rows) => {
        if (!cancelled) {
          setInvites(rows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load invites",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [crewId]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const invite = await createInvite(crewId);
      setInvites((rows) => [invite, ...rows]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create invite link",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy(invite: Invite) {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy — select the link and copy it manually.");
    }
  }

  async function revoke(invite: Invite) {
    setError(null);
    try {
      await revokeInvite(crewId, invite.id);
      setInvites((rows) =>
        rows.map((row) =>
          row.id === invite.id
            ? { ...row, revokedAt: new Date().toISOString() }
            : row,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not revoke invite link",
      );
    }
  }

  return (
    <div className="invite-panel">
      <h2>Invite people</h2>
      {invites.length === 0 ? (
        <p className="tagline">No invite links yet.</p>
      ) : (
        <ul className="invite-list">
          {invites.map((invite) => {
            const revoked = invite.revokedAt !== null;
            return (
              <li key={invite.id} className="invite-row">
                <code className="invite-link" title={inviteUrl(invite.token)}>
                  {inviteUrl(invite.token)}
                </code>
                <div className="invite-row-actions">
                  {revoked ? (
                    <span className="invited-status">revoked</span>
                  ) : (
                    <button type="button" onClick={() => void copy(invite)}>
                      {copiedId === invite.id ? "Copied" : "Copy"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void revoke(invite)}
                    disabled={revoked}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => void create()} disabled={busy}>
        {busy ? "…" : "New invite link"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
