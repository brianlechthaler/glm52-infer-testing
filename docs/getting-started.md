# Getting started

Setup, first boot, and basic usage of the GLM 5.2 inference stack.

## Prerequisites

- Linux host with **8 GPUs** (tensor parallel size defaults to 8). Tuned for RTX PRO 6000 Blackwell (SM120).
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) v2
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) for GPU passthrough
- Disk space for model weights (~hundreds of GB under `~/.cache/huggingface`)
- Optional: [Hugging Face token](https://huggingface.co/settings/tokens) if the model requires authentication (`HF_TOKEN`)

Verify GPU passthrough before starting:

```bash
docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi -L
```

## 1. Clone and configure

```bash
git clone https://github.com/brianlechthaler/glm52-infer-testing.git
cd glm52-infer-testing
cp .env.example .env
```

Edit `.env` as needed. At minimum, set `HF_TOKEN` when the model download requires it:

```bash
# .env
HF_TOKEN=hf_...
```

See [Configuration](features/configuration.md) for every variable.

## 2. Pull the vLLM image

The default stack uses a prebuilt SM120/B12X image:

```bash
docker pull voipmonitor/vllm:eldritch-enlightenment-v3f65c52-b12x80eb49b-fi5a73a36-cu132-20260703
```

The image tag is set by `VLLM_IMAGE` in `.env`.

## 3. Start the stack

Use the helper script (checks GPU passthrough and GPU count, then starts the stack) or Compose directly:

```bash
./scripts/up.sh            # validates GPUs, then docker compose --profile b12x up -d, then tails logs
# or
docker compose --profile b12x up -d
```

Started services:

| Service | URL | Description |
|---------|-----|-------------|
| `glm52-vllm` | http://localhost:8000 | OpenAI-compatible vLLM API |
| `frontend` | http://localhost:5173 | Chat UI with tok/s indicator and settings |

### First boot

The backend health check allows a long warm-up for JIT compilation and model load. First boot can take **30-45 minutes**. The frontend shows `Checking...` then `Online`/`Offline` server status, polled every 15 seconds.

## 4. Chat with the model

Open http://localhost:5173. The frontend proxies `/v1` and `/health` to the vLLM container over the internal Docker network, so no backend URL config is needed in the UI.

See [Chat frontend](features/chat-frontend.md) for the settings and reasoning controls.

## 5. Call the API directly

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/models

curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Smoke test

`scripts/smoke-test.sh` waits for health, lists models, and sends a non-thinking completion:

```bash
./scripts/smoke-test.sh
```

## Logs and lifecycle

```bash
docker compose logs -f glm52-vllm     # backend logs
docker compose logs -f frontend       # frontend logs
docker compose down                   # stop
```

## Alternative backend

An experimental profile builds stock `vllm/vllm-openai` with runtime SM120 patches:

```bash
docker compose --profile stock-patches up -d glm52-vllm-stock frontend
```

Sparse MLA support is incomplete in this profile; prefer the default B12X image. See [vLLM deployment](features/vllm-deployment.md).

## Use with opencode

The vLLM API is OpenAI-compatible with GLM tool-call and reasoning parsers enabled, so it works as the model backend for [opencode](https://opencode.ai). Run `./scripts/install-opencode.sh` to install opencode and write a global config that uses the full `MAX_MODEL_LEN` context window, or configure a custom `@ai-sdk/openai-compatible` provider manually pointing at `http://localhost:8000/v1` with `model` set to `vllm-local/glm-5.2`. See [opencode](features/opencode.md) for the full config and code samples.
