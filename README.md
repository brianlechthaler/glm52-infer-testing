# glm52-infer-testing

Local [GLM 5.2](https://huggingface.co/nvidia/GLM-5.2-NVFP4) inference with vLLM, Docker Compose, and a React chat frontend. Tuned for 8x NVIDIA RTX PRO 6000 Blackwell (SM120) GPUs with sparse MLA attention and NVFP4 MoE.

## Quick start

```bash
git clone https://github.com/brianlechthaler/glm52-infer-testing.git
cd glm52-infer-testing
cp .env.example .env      # set HF_TOKEN if the model needs auth
docker pull voipmonitor/vllm:eldritch-enlightenment-v3f65c52-b12x80eb49b-fi5a73a36-cu132-20260703
docker compose --profile b12x up -d
```

- Chat UI: http://localhost:5173
- vLLM API: http://localhost:8000

First boot takes 30-45 minutes (JIT compile + model load). See [Getting started](docs/getting-started.md) for details.

## Documentation

- [Getting started](docs/getting-started.md) - setup, first boot, calling the API
- [Architecture](docs/architecture.md) - services, request flow, backend variants
- Features
  - [vLLM deployment](docs/features/vllm-deployment.md) - B12X serving, SM120 patches, stock alternative
  - [Chat frontend](docs/features/chat-frontend.md) - React UI, settings, streaming
  - [Configuration](docs/features/configuration.md) - environment variables
  - [opencode](docs/features/opencode.md) - use this deployment as the opencode model backend
  - [CI](docs/features/ci.md) - test, lint, and container workflows

## Requirements

- Linux host with 8 SM120 (Blackwell) GPUs; tensor parallel size defaults to 8
- Docker + Compose v2 and the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- Hundreds of GB free for model weights in `~/.cache/huggingface`
- Optional `HF_TOKEN` if the model download requires auth

## License

See the repository license file when present.
