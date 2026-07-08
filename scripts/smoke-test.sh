#!/usr/bin/env bash
set -euo pipefail

PORT="${VLLM_PORT:-8000}"
MODEL="${SERVED_MODEL_NAME:-glm-5.2}"
BASE_URL="http://127.0.0.1:${PORT}"

echo "Waiting for ${BASE_URL}/health ..."
for _ in $(seq 1 120); do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 15
done

curl -fsS "${BASE_URL}/health"
echo

echo "Models:"
curl -fsS "${BASE_URL}/v1/models" | python3 -m json.tool

echo
echo "Non-think completion:"
curl -fsS "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Reply with exactly: GLM 5.2 is online.\"}],
    \"max_tokens\": 64,
    \"temperature\": 0,
    \"chat_template_kwargs\": {\"enable_thinking\": false}
  }" | python3 -m json.tool
