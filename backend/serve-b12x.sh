#!/usr/bin/env bash
set -euo pipefail

INDEX_TOPK_PATTERN="${INDEX_TOPK_PATTERN:-FFFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSSFSSS}"
HF_OVERRIDES="${HF_OVERRIDES:-{\"index_topk_pattern\":\"${INDEX_TOPK_PATTERN}\"}}"

MAX_CUDAGRAPH_CAPTURE_SIZE="${MAX_CUDAGRAPH_CAPTURE_SIZE:-$(( ${MAX_NUM_SEQS:-32} * (${MTP_SPECULATIVE_TOKENS:-0} + 1) ))}"

SPEC_ARGS=()
if [[ "${MTP_SPECULATIVE_TOKENS:-0}" != "0" ]]; then
  SPEC_JSON=$(printf '{"method":"mtp","num_speculative_tokens":%s,"moe_backend":"b12x","draft_sample_method":"probabilistic"}' "${MTP_SPECULATIVE_TOKENS}")
  SPEC_ARGS=(--speculative-config "${SPEC_JSON}")
fi

VLLM_BIN="${VLLM_BIN:-/opt/venv/bin/vllm}"
if [[ ! -x "${VLLM_BIN}" ]]; then
  VLLM_BIN="$(command -v vllm)"
fi

exec "${VLLM_BIN}" serve "${MODEL}" \
  --host "0.0.0.0" \
  --port "${VLLM_PORT:-8000}" \
  --served-model-name "${SERVED_MODEL_NAME:-glm-5.2}" \
  --trust-remote-code \
  --tensor-parallel-size "${TENSOR_PARALLEL_SIZE:-8}" \
  --decode-context-parallel-size "${DECODE_CONTEXT_PARALLEL_SIZE:-1}" \
  --enable-chunked-prefill \
  --enable-prefix-caching \
  --load-format fastsafetensors \
  --async-scheduling \
  -cc.pass_config.fuse_allreduce_rms=True \
  --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION:-0.95}" \
  --max-num-batched-tokens "${MAX_NUM_BATCHED_TOKENS:-8192}" \
  --max-num-seqs "${MAX_NUM_SEQS:-32}" \
  --max-cudagraph-capture-size "${MAX_CUDAGRAPH_CAPTURE_SIZE}" \
  --max-model-len "${MAX_MODEL_LEN:-1048576}" \
  --quantization modelopt_fp4 \
  --attention-backend "${ATTENTION_BACKEND:-B12X_MLA_SPARSE}" \
  --moe-backend b12x \
  --kv-cache-dtype "${KV_CACHE_DTYPE:-fp8}" \
  --tool-call-parser glm47 \
  --reasoning-parser glm45 \
  --enable-auto-tool-choice \
  --hf-overrides "${HF_OVERRIDES}" \
  --disable-custom-all-reduce \
  "${SPEC_ARGS[@]}"
