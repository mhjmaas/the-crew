# Portable SPA client: React + Vite, PixiJS, Zustand

The client is a React + Vite single-page app: PixiJS renders the 2D top-down Map, and a Zustand store projects world events into view state. The client is a *portable* SPA: the server URL is runtime configuration (same-origin by default in the browser), and the server accepts cross-origin clients (CORS plus WebSocket origin checks), so the same bundle can later be packaged as a desktop shell (Electron or Tauri).

**Considered options**: Next.js (SSR/RSC, API routes); Phaser or Konva for rendering; Redux Toolkit or XState for state.

**Why**: the client is a real-time WebSocket + canvas app and the Map renders client-side regardless, so SSR buys nothing and Next.js would mean running two Node servers in one container. PixiJS is a proven WebGL renderer for many animated sprites without game-engine bloat; Phaser is a full engine, more than this app needs. Zustand keeps the store minimal and testable as plain functions. The desktop constraint is near-free now and expensive to retrofit later.

**Consequences**: the client ships as static files served by the backend; the server must accept connections from non-browser origins (a desktop shell connects from `file://` or a custom protocol); desktop packaging is a future ticket, not MVP scope; a fully self-contained desktop app (bundling the server) is not a goal.
