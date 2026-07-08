# GLM 5.2 Chat Frontend

React chat UI for the local vLLM OpenAI-compatible API.

## Run with Docker

```bash
docker compose up -d frontend
```

Open http://localhost:5173

The compose service proxies `/v1` and `/health` to `glm52-vllm` on the internal Docker network.

## Development

```bash
docker run --rm -it -v "$(pwd)":/workspace/frontend -w /workspace/frontend node:22-bookworm-slim npm install
docker run --rm -it -v "$(pwd)":/workspace/frontend -w /workspace/frontend -p 5173:5173 node:22-bookworm-slim npm run dev -- --host 0.0.0.0
```

## Tests

```bash
docker run --rm -v "$(pwd)":/workspace/frontend -w /workspace/frontend node:22-bookworm-slim npm run coverage
docker run --rm -v "$(pwd)":/workspace/frontend -w /workspace/frontend node:22-bookworm-slim npm run lint
```
