import { type FormEvent, useEffect, useState } from "react";
import { createCrew, getCrew, refreshCrews, signOutAndLeave } from "../api.js";
import { useWorld, worldStore } from "../store.js";

export function CrewScreen() {
  const crews = useWorld((s) => s.crews);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshCrews().catch(() => {});
  }, []);

  async function enter(crewId: string) {
    const { crew, myInhabitantId } = await getCrew(crewId);
    worldStore.getState().applySnapshot(crew, myInhabitantId);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const crew = await createCrew(name, "office");
      worldStore.getState().applySnapshot(crew, crew.hostId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create crew");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crew-screen">
      <div className="card">
        <h1>Your crews</h1>
        {crews.length === 0 ? (
          <p className="tagline">No crews yet — create one below.</p>
        ) : (
          <ul className="crew-list">
            {crews.map((crew) => (
              <li key={crew.id}>
                <span>{crew.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    enter(crew.id).catch((err) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Could not enter crew",
                      ),
                    )
                  }
                >
                  Enter
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="create-crew" onSubmit={submit}>
          <input
            placeholder="Crew name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select defaultValue="office" aria-label="Map type">
            <option value="office">Office</option>
            <option value="house" disabled>
              House (coming soon)
            </option>
          </select>
          <button type="submit" disabled={busy}>
            {busy ? "…" : "Create crew"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={() => void signOutAndLeave()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
