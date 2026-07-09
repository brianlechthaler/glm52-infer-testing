# Chat frontend

React + Vite + TypeScript chat UI for the vLLM OpenAI-compatible API. Lives in `frontend/`.

## Pages

### Chat

<!-- screenshot: chat page with streaming response, server status Online, and tok/s indicator -->

- Streams responses from `/v1/chat/completions` using server-sent events.
- Shows server status (`Online`/`Offline`/`Checking...`) by polling `/health` every 15 seconds.
- Displays tokens/second and total tokens via the `TokenRate` component, updated from stream `usage`.
- Reasoning text (when thinking mode is on) is rendered separately from the answer.

### Settings

<!-- screenshot: settings page with Connection, Generation, GLM 5.2 reasoning, and Server deployment groups -->

Settings are persisted to `localStorage` under `glm52-infer-testing-settings` and merged over defaults on load. Controls are grouped:

| Group | Options |
|-------|---------|
| Connection | API base URL (empty = use the dev proxy), model (fetched from `/v1/models`) |
| Generation | temperature, max output tokens, top P, frequency penalty, presence penalty, stop sequences, seed, stream |
| GLM 5.2 reasoning | `enable_thinking` toggle, `reasoning_effort` (`max` or `high`) |
| Server deployment | tensor parallel size, GPU memory utilization, KV cache dtype, max sequences, max model length, MTP speculative tokens |

The Server deployment group mirrors `.env` values for reference; changing them in the UI does not reconfigure the running server. Update `.env` and restart vLLM to apply.

## Defaults

| Setting | Default |
|---------|---------|
| model | `glm-5.2` |
| temperature | `0.7` |
| maxTokens | `4096` |
| topP | `1` |
| stream | `true` |
| enable_thinking | `true` |
| reasoning_effort | `max` |

See `frontend/src/lib/settings.ts` for the full defaults and `frontend/src/types.ts` for the request shape.

## Dev proxy

In Compose, `VLLM_PROXY_TARGET` is `http://glm52-vllm:8000`. The Vite dev server proxies `/v1` and `/health` to it (`frontend/vite.config.ts`). Outside Compose it falls back to `http://host.docker.internal:8000`, and the `/health` proxy suppresses `ECONNREFUSED` noise while vLLM is still loading.

## Local development

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test         # vitest run
npm run lint     # eslint
npm run format:check   # prettier --check
```

Without Node installed on the host, run the same commands in a `node:22-bookworm-slim` container (see `frontend/README.md`).

## Related

- [Getting started](../getting-started.md) - running the full stack
- [Configuration](configuration.md)
