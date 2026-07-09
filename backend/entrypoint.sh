#!/usr/bin/env bash
set -euo pipefail

python3 /opt/glm52-infer-testing/apply_sm120_patches.py
exec vllm serve "$@"
