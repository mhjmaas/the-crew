import { useEffect } from "react";
import { getSession } from "./api.js";
import { INVITE_PREFIX } from "./invite.js";
import { AuthScreen } from "./screens/AuthScreen.js";
import { CrewScreen } from "./screens/CrewScreen.js";
import { InviteScreen } from "./screens/InviteScreen.js";
import { MapScreen } from "./screens/MapScreen.js";
import { useWorld, worldStore } from "./store.js";

export function App() {
  const user = useWorld((s) => s.user);
  const crew = useWorld((s) => s.crew);
  const inviteToken = window.location.pathname.startsWith(INVITE_PREFIX)
    ? decodeURIComponent(window.location.pathname.slice(INVITE_PREFIX.length))
    : null;

  useEffect(() => {
    let cancelled = false;
    void getSession().then((session) => {
      if (!cancelled) {
        worldStore.getState().setUser(session);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) {
    return <div className="booting">loading…</div>;
  }
  if (inviteToken && user) {
    return <InviteScreen token={inviteToken} />;
  }
  if (user === null) {
    return <AuthScreen />;
  }
  if (crew) {
    return <MapScreen crewId={crew.id} />;
  }
  return <CrewScreen />;
}
