import type {
  CrewState,
  InhabitantState,
  MapType,
  WorldEvent,
} from "@the-crew/world-core";
import { useStore } from "zustand/react";
import { createStore } from "zustand/vanilla";

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

export interface ViewState {
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

const patchInhabitant = (
  crew: CrewState,
  inhabitantId: string,
  patch: (inhabitant: InhabitantState) => InhabitantState,
): { crew: CrewState } => ({
  crew: {
    ...crew,
    inhabitants: crew.inhabitants.map((i) =>
      i.id === inhabitantId ? patch(i) : i,
    ),
  },
});

export function createWorldStore() {
  return createStore<ViewState>()((set) => ({
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
            return {
              crew: { ...crew, inhabitants: [...crew.inhabitants, inhabitant] },
            };
          }
          case "inhabitant/left":
            return {
              crew: {
                ...crew,
                inhabitants: crew.inhabitants.filter(
                  (i) => i.id !== event.inhabitantId,
                ),
              },
            };
          case "inhabitant/moved":
            return patchInhabitant(crew, event.inhabitantId, (i) => ({
              ...i,
              position: { ...event.position },
            }));
          case "room/entered":
            return patchInhabitant(crew, event.inhabitantId, (i) => ({
              ...i,
              room: event.room.id,
            }));
          case "room/left":
            return patchInhabitant(crew, event.inhabitantId, (i) => ({
              ...i,
              room: null,
            }));
        }
      }),
    leaveCrew: () =>
      set({ crew: null, myInhabitantId: null, connected: false }),
  }));
}

export const worldStore = createWorldStore();

export function useWorld<T>(selector: (state: ViewState) => T): T {
  return useStore(worldStore, selector);
}
