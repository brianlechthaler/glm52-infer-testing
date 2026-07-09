# vLLM deployment

How GLM 5.2 is served on vLLM, the SM120-specific setup, and the two backend variants.

## B12X backend (default)

The default `glm52-vllm` service uses a prebuilt SM120-native vLLM image (`VLLM_IMAGE`) and runs `backend/serve-b12x.sh`. The script assembles the `vllm serve` invocation from environment variables, so tuning is done through `.env`, not by editing the command.

Key serve flags set by `serve-b12x.sh`:

| Flag | Source | Notes |
|------|--------|-------|
| `--quantization modelopt_fp4` | fixed | NVFP4 quantization for the GLM-5.2-NVFP4 weights |
| `--attention-backend` | `ATTENTION_BACKEND` (default `B12X_MLA_SPARSE`) | B12X sparse MLA on SM120 |
| `--moe-backend b12x` | fixed | B12X MoE kernels |
| `--kv-cache-dtype` | `KV_CACHE_DTYPE` (default `fp8`) | fp8 KV cache, required on SM120 |
| `--tensor-parallel-size` | `TENSOR_PARALLEL_SIZE` (default 8) | Must match GPU count |
| `--decode-context-parallel-size` | `DECODE_CONTEXT_PARALLEL_SIZE` (default 1) | |
| `--load-format fastsafetensors` | fixed | Fast weight loading |
| `--async-scheduling` | fixed | |
| `--enable-chunked-prefill` | fixed | |
| `--enable-prefix-caching` | fixed | |
| `--tool-call-parser glm47` / `--reasoning-parser glm45` | fixed | GLM tool-call and reasoning parsing |
| `--enable-auto-tool-choice` | fixed | |
| `--disable-custom-all-reduce` | fixed | |
| `--hf-overrides` | derived from `INDEX_TOPK_PATTERN` | Injects `index_topk_pattern` into the model config |

### MTP speculative decoding

When `MTP_SPECULATIVE_TOKENS` is non-zero, the script adds `--speculative-config` with `method=mtp`, the configured token count, `moe_backend=b12x`, and `draft_sample_method=probabilistic`. It also scales `--max-cudagraph-capture-size` to `MAX_NUM_SEQS * (MTP_SPECULATIVE_TOKENS + 1)`. Defaults to 0 in `.env.example` because B12X does not yet support the unquantized MTP draft MoE.

### INDEX_TOPK_PATTERN

`INDEX_TOPK_PATTERN` is a 78-character string of `F` (full) and `S` (shared) tokens that controls the GLM 5.2 DSA indexer layers. It is passed to vLLM via `--hf-overrides` as `index_topk_pattern`. The default pattern is coherence-critical; change it only if you know the layer layout.

## Stock + patches backend

The `stock-patches` profile builds `backend/Dockerfile` from `vllm/vllm-openai:latest`. Its entrypoint runs `backend/apply_sm120_patches.py`, then `vllm serve` with explicit CLI flags (see the `glm52-vllm-stock` command in `docker-compose.yml`).

### SM120 patches

`apply_sm120_patches.py` patches the installed vLLM package at runtime. Stock vLLM enables DeepGEMM on capability family 120, but the bundled DeepGEMM build only ships SM90/SM100 kernels, so the GLM 5.2 sparse indexer aborts during CUDA graph profiling with `Unsupported architecture`. The script:

- Excludes SM120 from `support_deep_gemm` in `platforms/cuda.py`
- Adds a helper that skips DeepGEMM scheduler metadata in `v1/attention/backends/mla/indexer.py`
- Guards `get_paged_mqa_logits_metadata` in `utils/deep_gemm.py` to return an empty tensor on SM120
- Adds PyTorch FP8 MQA and paged MQA fallbacks for the indexer on SM120

Each patch is idempotent and errors out if an expected snippet is missing. This backend uses `FLASHINFER_MLA_SPARSE_SM120` attention and `--enforce-eager` (no CUDA graphs), and disables DeepGEMM via env. Sparse MLA is incomplete here; use it for experimentation, not production.

## Health check and warm-up

Both backends define a health check against `http://localhost:8000/health` with a long `start_period` (45 min for B12X, 30 min for stock) to cover JIT compilation and model load. The frontend polls `/health` every 15 seconds and reports `Online`/`Offline`.

## Related

- [Configuration](configuration.md) - all environment variables
- [Architecture](../architecture.md) - how the services connect
