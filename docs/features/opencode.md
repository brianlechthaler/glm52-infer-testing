# opencode

Using this GLM 5.2 vLLM deployment as the model backend for [opencode](https://opencode.ai), the open source AI coding agent. vLLM exposes an OpenAI-compatible API with GLM tool-call and reasoning parsers enabled, so opencode can drive GLM-5.2 for agentic coding tasks (file edits, shell commands, search) over a local, private endpoint.

## Why this works

opencode talks to any OpenAI-compatible endpoint via the [`@ai-sdk/openai-compatible`](https://ai-sdk.dev/) provider. This stack already serves one:

- OpenAI-compatible API at `http://localhost:8000/v1` (see `docker-compose.yml`, `VLLM_PORT`)
- Tool calling via `--tool-call-parser glm47 --enable-auto-tool-choice` (set in `backend/serve-b12x.sh`) — opencode relies on tool calls to act
- Reasoning via `--reasoning-parser glm45` — opencode renders thinking blocks separately
- 1M context (`MAX_MODEL_LEN`) and a configurable output cap

No cloud provider or API key is required; the model runs on your GPUs.

## Prerequisites

- This stack running and healthy: `curl http://localhost:8000/health` (first boot takes 30-45 min — see [Getting started](../getting-started.md))
- opencode installed ([install instructions](https://opencode.ai/docs/))
- The served model name matches `SERVED_MODEL_NAME` in `.env` (default `glm-5.2`)

## Configure opencode

opencode reads config (JSON or JSONC) from `~/.config/opencode/opencode.jsonc` (global) or `opencode.json`/`opencode.jsonc` in a project root. Project config overrides global. Add a custom provider pointing at the local vLLM server:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "vllm-local": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local vLLM Server",
      "options": {
        "baseURL": "http://localhost:8000/v1",
        "apiKey": "sk-local"
      },
      "models": {
        "glm-5.2": {
          "name": "GLM-5.2",
          "limit": {
            "context": 1048576,
            "output": 16384
          }
        }
      }
    }
  },
  "model": "vllm-local/glm-5.2"
}
```

Field reference:

| Field | Purpose |
|-------|---------|
| `$schema` | Enables editor validation/autocomplete against the opencode config schema |
| `provider.<id>` | Custom provider ID — any string; `vllm-local` is conventional here |
| `provider.<id>.npm` | AI SDK package; `@ai-sdk/openai-compatible` works for any OpenAI-compatible endpoint |
| `provider.<id>.name` | Display name shown in the opencode model picker |
| `options.baseURL` | vLLM's `/v1` endpoint. From the host: `http://localhost:8000/v1` |
| `options.apiKey` | vLLM ignores this locally; any non-empty string satisfies the SDK |
| `models.<id>` | Model entry. The `<id>` **must match `SERVED_MODEL_NAME`** (default `glm-5.2`), which is the `id` returned by `GET /v1/models` |
| `models.<id>.name` | Human-readable name in the picker |
| `limit.context` | Max context tokens; keep `<=` `MAX_MODEL_LEN` (default 1048576) |
| `limit.output` | Cap on generated tokens per response; keep `<=` your desired max |
| `model` | Default model in `provider/model` form, e.g. `vllm-local/glm-5.2` |

> The `model` field must reference a model defined under `provider.<id>.models`. A mismatch (for example pointing at a model not declared in the `models` map) means opencode can't select it.

### Remote host

If opencode runs on a different machine than vLLM, set `baseURL` to that host's address (for example `http://gpu-host:8000/v1`) and ensure `VLLM_PORT` is reachable from the opencode host. The `apiKey` is still ignored by vLLM unless you configure auth server-side.

### Per-project config

To pin this backend for one repo without changing global config, drop an `opencode.json` in the project root with just the `provider` and `model` keys. Project config merges over (and overrides) global config.

## Verify the connection

List models opencode can see:

```bash
opencode models vllm-local
# Should show: vllm-local/glm-5.2
```

Or check the endpoint directly:

```bash
curl http://localhost:8000/v1/models
# "id" must be "glm-5.2" (your SERVED_MODEL_NAME)
```

Inspect the resolved config:

```bash
opencode debug config
```

## Code samples

### opencode CLI

Start the interactive TUI against GLM-5.2:

```bash
opencode
```

Run a one-shot, non-interactive prompt with an explicit model:

```bash
opencode run -m vllm-local/glm-5.2 "Explain what docker-compose.yml does in this repo"
```

Stream JSON events (useful for scripting):

```bash
opencode run -m vllm-local/glm-5.2 --format json "List the backend service names"
```

Use a one-off config file without touching your global config:

```bash
export OPENCODE_CONFIG=/path/to/opencode-vllm.jsonc
opencode run "Summarize the architecture"
```

### Raw OpenAI-compatible call (curl)

opencode hits the same endpoint; useful for debugging the backend independently:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.2",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

Disable thinking for a request (the `glm45` reasoning parser handles this):

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.2",
    "messages": [{"role": "user", "content": "Reply with exactly: ok"}],
    "chat_template_kwargs": {"enable_thinking": false},
    "max_tokens": 16,
    "temperature": 0
  }'
```

### Tool call (curl)

This is the request shape opencode sends when it wants the model to call a tool. With the `glm47` tool parser, GLM-5.2 returns a `tool_calls` array:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.2",
    "messages": [
      {"role": "user", "content": "What files are in the current directory?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "list_files",
          "description": "List files in a directory",
          "parameters": {
            "type": "object",
            "properties": {
              "path": {"type": "string", "description": "Directory path"}
            },
            "required": ["path"]
          }
        }
      }
    ]
  }'
```

### TypeScript (Vercel AI SDK)

opencode uses the same AI SDK and `@ai-sdk/openai-compatible` package, so this mirrors what opencode sends:

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const vllm = createOpenAICompatible({
  name: "Local vLLM Server",
  baseURL: "http://localhost:8000/v1",
  apiKey: "sk-local",
});

const result = await generateText({
  model: vllm("glm-5.2"),
  prompt: "Refactor this function to use async/await",
});

console.log(result.text);
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="sk-local",
)

stream = client.chat.completions.create(
    model="glm-5.2",
    messages=[{"role": "user", "content": "Write a haiku about GPUs"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

## Tuning for opencode

| Concern | Recommendation |
|---------|----------------|
| Output length | opencode edits can be long. Set `limit.output` to bound latency; the server has no separate output cap, so this is the practical limit. |
| Tool calling | Requires `--tool-call-parser glm47 --enable-auto-tool-choice`, set in both backends (see `backend/serve-b12x.sh` and the stock `command` in `docker-compose.yml`). If tools aren't being called, confirm you're on a backend with these flags. |
| Reasoning | GLM-5.2 emits reasoning tokens parsed by `glm45`; opencode shows them as thinking blocks. Lower `reasoning_effort` or pass `chat_template_kwargs.enable_thinking=false` to reduce latency. |
| Context | `MAX_MODEL_LEN` (default 1048576) bounds total context. opencode sends full session history, so long sessions approach this; raise `MAX_MODEL_LEN` with VRAM headroom, or start new sessions. |
| Concurrency | opencode is single-session; `MAX_NUM_SEQS=32` is ample. Lower it to reclaim VRAM for other workloads. |
| First-boot latency | JIT compile + model load takes 30-45 min on first start. opencode can't connect until `/health` returns 200. |

## Troubleshooting

- **`model not found` / model missing from picker** — the model id under `models` must equal `SERVED_MODEL_NAME` (default `glm-5.2`). Verify with `curl http://localhost:8000/v1/models`.
- **Tool calls not returned** — confirm the backend runs with `--tool-call-parser glm47 --enable-auto-tool-choice`. Both the B12X default and the `stock-patches` profile set these.
- **Empty or garbled responses** — vLLM may still be JIT-compiling. Wait for `curl http://localhost:8000/health` to return 200.
- **Connection refused** — vLLM isn't up, or `baseURL` is wrong. From the host use `http://localhost:8000/v1`; from another machine use that host's address.
- **`model` references an undefined model** — the top-level `model` must be `provider/<model-id>` where `<model-id>` is a key in `provider.<id>.models`.

## Related

- [Getting started](../getting-started.md) - bring the stack up
- [Configuration](configuration.md) - `.env` variables (including `SERVED_MODEL_NAME`, `MAX_MODEL_LEN`)
- [vLLM deployment](vllm-deployment.md) - serve flags for tool/reasoning parsers
- [Architecture](../architecture.md) - how the services connect
- [opencode config reference](https://opencode.ai/docs/config/) - full opencode schema
