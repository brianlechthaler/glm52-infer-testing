# Configuration

All runtime tuning is done through `.env` (copy from `.env.example`). The Compose file reads these variables; defaults apply when unset.

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL` | `nvidia/GLM-5.2-NVFP4` | Hugging Face model ID to serve |
| `SERVED_MODEL_NAME` | `glm-5.2` | Name exposed by the API; must match the frontend model setting |
| `TENSOR_PARALLEL_SIZE` | `8` | GPUs to shard across. Must match available GPUs |
| `DECODE_CONTEXT_PARALLEL_SIZE` | `1` | Decode context parallel size |
| `NVIDIA_VISIBLE_DEVICES` | `all` | Which GPUs Docker exposes to the backend |
| `GPU_MEMORY_UTILIZATION` | `0.95` | Fraction of VRAM vLLM may use |
| `KV_CACHE_DTYPE` | `fp8` | KV cache dtype. `fp8` (fp8_ds_mla packed layout) is required on SM120 |
| `MAX_NUM_SEQS` | `32` | Max concurrent sequences |
| `MAX_NUM_BATCHED_TOKENS` | `8192` | Max tokens per batch |
| `MAX_MODEL_LEN` | `262144` | Context length |
| `MTP_SPECULATIVE_TOKENS` | `0` | MTP speculative decoding tokens. 0 because B12X lacks unquantized MTP draft MoE support |
| `INDEX_TOPK_PATTERN` | 78-char F/S string | GLM 5.2 DSA indexer layer pattern, injected via `--hf-overrides` |
| `HF_HOME` | `~/.cache/huggingface` | Host Hugging Face cache (mounted into the container) |
| `HF_TOKEN` | unset | Hugging Face token, needed if the model download requires auth |
| `VLLM_PORT` | `8000` | vLLM API port on the host |
| `FRONTEND_PORT` | `5173` | Chat UI port on the host |
| `VLLM_IMAGE` | `voipmonitor/vllm:...` | Prebuilt SM120/B12X vLLM image for the default backend |
| `ATTENTION_BACKEND` | `B12X_MLA_SPARSE` | Attention backend for the B12X backend |
| `VLLM_STOCK_IMAGE` | `vllm/vllm-openai:latest` | Base image for the `stock-patches` profile |

## Applying changes

1. Edit `.env`.
2. Restart the backend: `docker compose up -d glm52-vllm` (or `glm52-vllm-stock` for the stock profile).
3. First boot after a config change re-runs JIT compilation, so expect another long warm-up.

The frontend's Server deployment settings group mirrors these values for reference but does not reconfigure the server.

## Related

- [vLLM deployment](vllm-deployment.md) - how these map to `vllm serve` flags
- [Architecture](../architecture.md)
