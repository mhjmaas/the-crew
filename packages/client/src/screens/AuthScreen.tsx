import { AVATARS } from "@the-crew/world-core";
import { type FormEvent, useState } from "react";
import { refreshCrews, signIn, signUp } from "../api.js";
import { worldStore } from "../store.js";

export function AuthScreen() {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARS[0]!.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user =
        mode === "sign-up"
          ? await signUp({ name, email, password, avatarId })
          : await signIn({ email, password });
      worldStore.getState().setUser(user);
      await refreshCrews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="card" onSubmit={submit}>
        <h1>the-crew</h1>
        <p className="tagline">a shared space for humans and agents</p>
        {mode === "sign-up" && (
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              placeholder="Marcel"
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="at least 8 characters"
          />
        </label>
        {mode === "sign-up" && (
          <div className="avatar-picker">
            <span>Avatar</span>
            <div className="swatches">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  title={avatar.name}
                  className={
                    avatar.id === avatarId ? "swatch selected" : "swatch"
                  }
                  style={{ backgroundColor: avatar.color }}
                  onClick={() => setAvatarId(avatar.id)}
                />
              ))}
            </div>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "…" : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
        >
          {mode === "sign-up"
            ? "Have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
