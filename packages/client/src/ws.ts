import type { Command, CrewState, WorldEvent } from "@the-crew/world-core";

export interface CrewSocketHandlers {
  onOpen?(): void;
  onClose?(): void;
  onSnapshot?(crew: CrewState, myInhabitantId: string | null): void;
  onEvent?(event: WorldEvent): void;
  onError?(message: string): void;
}

export interface CrewSocket {
  send(command: Command): void;
  close(): void;
}

export function connectCrewSocket(crewId: string, handlers: CrewSocketHandlers): CrewSocket {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(
    `${protocol}://${window.location.host}/ws?crew=${encodeURIComponent(crewId)}`,
  );

  ws.onopen = () => handlers.onOpen?.();
  ws.onclose = () => handlers.onClose?.();
  ws.onmessage = (message) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) {
      return;
    }
    const msg = parsed as {
      type?: string;
      crew?: CrewState;
      myInhabitantId?: string | null;
      event?: WorldEvent;
      error?: string;
    };
    if (msg.type === "snapshot" && msg.crew) {
      handlers.onSnapshot?.(msg.crew, msg.myInhabitantId ?? null);
    } else if (msg.type === "event" && msg.event) {
      handlers.onEvent?.(msg.event);
    } else if (msg.type === "error") {
      handlers.onError?.(msg.error ?? "unknown error");
    }
  };

  return {
    send(command) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "command", command }));
      }
    },
    close() {
      ws.close();
    },
  };
}
