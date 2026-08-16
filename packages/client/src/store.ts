import { createStore } from "zustand/vanilla";
import { useStore } from "zustand/react";
import type { CrewState, MapType, WorldEvent } from "@the-crew/world-core";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatarId: string;
}

export interface CrewSummary {
  id: string;
  name: string;
  mapType: MapType;
}

export interface WorldState {
  user: ApiUser | null | undefined;
  crews: CrewSummary[];
  crew: CrewState | null;
  myInhabitantId: string | null;
  connected: boolean;
  error: string | null;
  setUser(user: ApiUser | null): void;
  setCrews(crews: CrewSummary[]): void;
  setConnected(connected: boolean): void;
  setError(error: string | null): void;
  applySnapshot(crew: CrewState, myInhabitantId: string | null): void;
  applyEvent(event: WorldEvent): void;
  leaveCrew(): void;
}

export function createWorldStore() {
  return createStore<WorldState>()((set) => ({
    user: undefined,
    crews: [],
    crew: null,
    myInhabitantId: null,
    connected: false,
    error: null,
    setUser: (user) => set({ user }),
    setCrews: (crews) => set({ crews }),
    setConnected: (connected) => set({ connected }),
    setError: (error) => set({ error }),
    applySnapshot: (crew, myInhabitantId) => set({ crew, myInhabitantId }),
    applyEvent: (event) =>
      set((state) => {
        if (event.type === "crew/created") {
          if (state.crew && state.crew.id !== event.crewId) {
            return {};
          }
          return {
            crew: {
              id: event.crewId,
              name: event.name,
              map: event.map,
              hostId: event.hostId,
              inhabitants: [],
            },
          };
        }
        const crew = state.crew;
        if (!crew) {
          return {};
        }
        switch (event.type) {
          case "inhabitant/joined": {
            if (crew.inhabitants.some((i) => i.id === event.inhabitant.id)) {
              return {};
            }
            const inhabitant = { ...event.inhabitant };
            return { crew: { ...crew, inhabitants: [...crew.inhabitants, inhabitant] } };
          }
          case "inhabitant/left":
            return {
              crew: {
                ...crew,
                inhabitants: crew.inhabitants.filter((i) => i.id !== event.inhabitantId),
              },
            };
          case "inhabitant/moved":
            return {
              crew: {
                ...crew,
                inhabitants: crew.inhabitants.map((i) =>
                  i.id === event.inhabitantId ? { ...i, position: { ...event.position } } : i,
                ),
              },
            };
          case "room/entered":
            return {
              crew: {
                ...crew,
                inhabitants: crew.inhabitants.map((i) =>
                  i.id === event.inhabitantId ? { ...i, room: event.room.id } : i,
                ),
              },
            };
          case "room/left":
            return {
              crew: {
                ...crew,
                inhabitants: crew.inhabitants.map((i) =>
                  i.id === event.inhabitantId ? { ...i, room: null } : i,
                ),
              },
            };
        }
      }),
    leaveCrew: () => set({ crew: null, myInhabitantId: null, connected: false }),
  }));
}

export const worldStore = createWorldStore();

export function useWorld<T>(selector: (state: WorldState) => T): T {
  return useStore(worldStore, selector);
}
