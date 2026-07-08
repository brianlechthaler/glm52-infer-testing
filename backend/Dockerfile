ARG VLLM_BASE_IMAGE=vllm/vllm-openai:latest
FROM ${VLLM_BASE_IMAGE}

COPY apply_sm120_patches.py /opt/infer/apply_sm120_patches.py
COPY entrypoint.sh /opt/infer/entrypoint.sh
RUN chmod +x /opt/infer/entrypoint.sh

ENTRYPOINT ["/opt/infer/entrypoint.sh"]
