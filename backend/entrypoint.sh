#!/usr/bin/env bash
set -euo pipefail

python3 /opt/infer/apply_sm120_patches.py
exec vllm serve "$@"
