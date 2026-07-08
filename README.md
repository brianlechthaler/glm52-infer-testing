# glm52-infer-testing

Local [GLM 5.2](https://huggingface.co/nvidia/GLM-5.2-NVFP4) inference with vLLM, Docker Compose, and a React chat frontend. Tuned for **8× NVIDIA RTX PRO 6000 Blackwell (SM120)** GPUs with sparse MLA attention and NVFP4 MoE.

## Prerequisites

- Linux host with **8 GPUs** (tensor parallel size defaults to 8)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) v2
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- Enough disk space for the model weights (~hundreds of GB in `~/.cache/huggingface`)
- Optional: [Hugging Face token](https://huggingface.co/settings/tokens) if the model requires authentication (`HF_TOKEN`)

## Quickstart

### 1. Clone and configure

```bash
git clone https://github.com/brianlechthaler/glm52-infer-testing.git
cd glm52-infer-testing
cp .env.example .env
```

Edit `.env` if needed. At minimum, set `HF_TOKEN` when the model download requires it:

```bash
# .env
HF_TOKEN=hf_...
```

### 2. Pull the vLLM image

The default stack uses a prebuilt SM120/B12X image (see `.env.example` for the tag):

```bash
docker pull voipmonitor/vllm:eldritch-enlightenment-v3f65c52-b12x80eb49b-fi5a73a36-cu132-20260703
```

### 3. Start the stack

```bash
docker compose up -d
```

This starts:

| Service | URL | Description |
|---------|-----|-------------|
| `glm52-vllm` | http://localhost:8000 | OpenAI-compatible vLLM API |
| `frontend` | http://localhost:5173 | Chat UI with tok/s indicator and tuning settings |

The backend health check allows a long warm-up (JIT compile, model load). First boot can take **30–45 minutes**.

### 4. Chat with the model

Open **http://localhost:5173** in your browser. The frontend proxies `/v1` and `/health` to the vLLM container.

### 5. Call the API directly

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

## Configuration

Key environment variables (see `.env.example` for the full list):

| Variable | Default | Notes |
|----------|---------|-------|
| `MODEL` | `nvidia/GLM-5.2-NVFP4` | Hugging Face model ID |
| `TENSOR_PARALLEL_SIZE` | `8` | Must match available GPUs |
| `GPU_MEMORY_UTILIZATION` | `0.95` | Fraction of VRAM vLLM may use |
| `MAX_MODEL_LEN` | `262144` | Context length |
| `KV_CACHE_DTYPE` | `fp8` | Required on SM120 |
| `MTP_SPECULATIVE_TOKENS` | `0` | MTP speculative decoding (enable when supported) |
| `VLLM_PORT` | `8000` | API port on the host |
| `FRONTEND_PORT` | `5173` | Chat UI port on the host |

## Alternative backend (stock vLLM + patches)

An experimental profile builds stock `vllm/vllm-openai` with runtime SM120 patches:

```bash
docker compose --profile stock-patches up -d glm52-vllm-stock frontend
```

Sparse MLA support is incomplete in this profile; prefer the default B12X image for production use.

## Development

### Frontend

See [frontend/README.md](frontend/README.md) for local dev and test commands.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test
npm run lint
```

### Logs

```bash
docker compose logs -f glm52-vllm
docker compose logs -f frontend
```

### Stop

```bash
docker compose down
```

## Project layout

```
.
├── backend/           # vLLM entrypoints, Dockerfile, SM120 patches
├── frontend/          # React/Vite chat UI
├── docker-compose.yml
└── .env.example
```

## License

See repository license file when present.
