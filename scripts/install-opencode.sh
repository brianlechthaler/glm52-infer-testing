#!/usr/bin/env bash
set -euo pipefail

# Installs opencode (if missing) and writes a global opencode config that points
# at this GLM 5.2 vLLM deployment, using the full context window served by vLLM.
#
# Context window and served model name are read from .env (falling back to
# .env.example, then to the built-in defaults) so the opencode config always
# matches MAX_MODEL_LEN on the backend.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

read_env_var() {
  # read_env_var VAR_NAME DEFAULT — first match wins across .env then .env.example
  local name="$1" default="$2" file value
  for file in "${ROOT_DIR}/.env" "${ROOT_DIR}/.env.example"; do
    [[ -f "$file" ]] || continue
    value="$(grep -E "^${name}=" "$file" | tail -n1 | cut -d= -f2- || true)"
    if [[ -n "${value}" ]]; then
      printf '%s' "${value}"
      return 0
    fi
  done
  printf '%s' "${default}"
}

MAX_MODEL_LEN="${MAX_MODEL_LEN:-$(read_env_var MAX_MODEL_LEN 655360)}"
SERVED_MODEL_NAME="${SERVED_MODEL_NAME:-$(read_env_var SERVED_MODEL_NAME glm-5.2)}"
VLLM_PORT="${VLLM_PORT:-$(read_env_var VLLM_PORT 8000)}"
VLLM_BASE_URL="${VLLM_BASE_URL:-http://localhost:${VLLM_PORT}/v1}"
OPENCODE_OUTPUT_LIMIT="${OPENCODE_OUTPUT_LIMIT:-16384}"

CONFIG_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/opencode"
CONFIG_FILE="${CONFIG_DIR}/opencode.jsonc"

if ! command -v opencode >/dev/null 2>&1; then
  echo "opencode not found; installing via https://opencode.ai/install ..."
  curl -fsSL https://opencode.ai/install | bash
fi

if ! command -v opencode >/dev/null 2>&1; then
  # The installer commonly drops the binary in ~/.opencode/bin.
  export PATH="${HOME}/.opencode/bin:${PATH}"
fi

if ! command -v opencode >/dev/null 2>&1; then
  echo "opencode installation did not produce an 'opencode' binary on PATH." >&2
  echo "Add its bin directory (e.g. ~/.opencode/bin) to PATH and re-run." >&2
  exit 1
fi

echo "Configuring opencode at ${CONFIG_FILE}"
echo "  baseURL          = ${VLLM_BASE_URL}"
echo "  served model     = ${SERVED_MODEL_NAME}"
echo "  context window   = ${MAX_MODEL_LEN}"

if [[ -f "${CONFIG_FILE}" ]]; then
  cp "${CONFIG_FILE}" "${CONFIG_FILE}.bak"
  echo "  backed up existing config to ${CONFIG_FILE}.bak"
fi

mkdir -p "${CONFIG_DIR}"
cat > "${CONFIG_FILE}" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "vllm-local": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local vLLM Server",
      "options": {
        "baseURL": "${VLLM_BASE_URL}",
        "apiKey": "sk-local"
      },
      "models": {
        "${SERVED_MODEL_NAME}": {
          "name": "GLM-5.2",
          "limit": {
            "context": ${MAX_MODEL_LEN},
            "output": ${OPENCODE_OUTPUT_LIMIT}
          }
        }
      }
    }
  },
  "model": "vllm-local/${SERVED_MODEL_NAME}"
}
EOF

echo "Done. Verify with: opencode debug config"
