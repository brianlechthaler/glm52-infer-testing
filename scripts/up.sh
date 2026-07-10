#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the host" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "docker daemon is not reachable" >&2
  exit 1
fi

if ! docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi -L >/dev/null 2>&1; then
  echo "GPU passthrough failed. Install/configure the NVIDIA Container Toolkit." >&2
  exit 1
fi

GPU_COUNT="$(docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi -L | wc -l)"
TP="${TENSOR_PARALLEL_SIZE:-8}"
if [[ "$GPU_COUNT" -lt "$TP" ]]; then
  echo "Need at least ${TP} GPUs visible to Docker, found ${GPU_COUNT}" >&2
  exit 1
fi

echo "Pulling vLLM image and starting GLM 5.2 on ${GPU_COUNT} GPU(s)..."
docker compose --profile b12x pull
docker compose --profile b12x up -d

echo
echo "Following logs (Ctrl+C detaches; container keeps running)..."
docker compose logs -f glm52-vllm
