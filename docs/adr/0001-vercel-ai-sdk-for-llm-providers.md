# LLM provider access via Vercel AI SDK

Agents can run on any LLM — local or cloud. We decided to access providers through the Vercel AI SDK, starting with plain OpenAI-compatible endpoints (base URL + API key + model), rather than integrating per-provider SDKs.

**Considered options**: per-provider SDK integrations (OpenAI, Anthropic, Google, Ollama each separately); raw OpenAI-compatible HTTP calls without a SDK.

**Consequences**: one integration surface to maintain; adding a provider is a config or preset, not new code; the SDK is the seam between the Agent layer and any LLM.
