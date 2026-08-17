import type { Command, WorldEvent } from "@the-crew/world-core";
import { useEffect, useRef } from "react";
import { refreshCrews, signOut } from "../api.js";
import { MapRenderer } from "../map/MapRenderer.js";
import { useWorld, worldStore } from "../store.js";
import { type CrewSocket, connectCrewSocket } from "../ws.js";

export function MapScreen({ crewId }: { crewId: string }) {
  const crew = useWorld((s) => s.crew);
  const myInhabitantId = useWorld((s) => s.myInhabitantId);
  const connected = useWorld((s) => s.connected);
  const error = useWorld((s) => s.error);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const socketRef = useRef<CrewSocket | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let disposed = false;
    const renderer = new MapRenderer(host);
    rendererRef.current = renderer;
    const socket = connectCrewSocket(crewId, {
      onOpen: () => worldStore.getState().setConnected(true),
      onClose: () => worldStore.getState().setConnected(false),
      onSnapshot: (c, myId) => worldStore.getState().applySnapshot(c, myId),
      onEvent: (event: WorldEvent) => worldStore.getState().applyEvent(event),
      onError: (message) => worldStore.getState().setError(message),
    });
    socketRef.current = socket;
    renderer.setClickHandler((pos) => {
      const s = worldStore.getState();
      if (!s.myInhabitantId) {
        return;
      }
      const command: Command = {
        type: "inhabitant/move",
        crewId,
        inhabitantId: s.myInhabitantId,
        position: pos,
      };
      socket.send(command);
    });
    void renderer.init().then(() => {
      if (disposed) {
        return;
      }
      const s = worldStore.getState();
      if (s.crew) {
        renderer.setMap(s.crew.map);
        renderer.setInhabitants(s.crew.inhabitants);
      }
    });
    return () => {
      disposed = true;
      socket.close();
      socketRef.current = null;
      rendererRef.current = null;
      renderer.destroy();
    };
  }, [crewId]);

  const map = useWorld((s) => s.crew?.map);
  const inhabitants = useWorld((s) => s.crew?.inhabitants);

  useEffect(() => {
    if (map) {
      rendererRef.current?.setMap(map);
    }
  }, [map]);

  useEffect(() => {
    if (inhabitants) {
      rendererRef.current?.setInhabitants(inhabitants);
    }
  }, [inhabitants]);

  function leave() {
    worldStore.getState().leaveCrew();
    void refreshCrews().catch(() => {});
  }

  async function doSignOut() {
    try {
      await signOut();
    } finally {
      worldStore.getState().leaveCrew();
      worldStore.getState().setUser(null);
    }
  }

  if (!crew) {
    return null;
  }

  const me = crew.inhabitants.find((i) => i.id === myInhabitantId);
  const roomName = me
    ? crew.map.rooms.find((r) => r.id === me.room)?.name
    : undefined;

  return (
    <div className="map-screen">
      <header className="topbar">
        <h1>{crew.name}</h1>
        <span className={connected ? "status online" : "status"}>
          {connected ? "live" : "connecting…"}
        </span>
        {me && (
          <span className="me">
            {me.name} · {roomName ?? "open space"}
          </span>
        )}
        {error && <span className="error">{error}</span>}
        <div className="topbar-actions">
          <button type="button" onClick={leave}>
            Leave
          </button>
          <button type="button" onClick={() => void doSignOut()}>
            Sign out
          </button>
        </div>
      </header>
      <div ref={hostRef} className="map-host" />
    </div>
  );
}
