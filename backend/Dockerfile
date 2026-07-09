ARG VLLM_BASE_IMAGE=vllm/vllm-openai:latest
FROM ${VLLM_BASE_IMAGE}

COPY apply_sm120_patches.py /opt/glm52-infer-testing/apply_sm120_patches.py
COPY entrypoint.sh /opt/glm52-infer-testing/entrypoint.sh
RUN chmod +x /opt/glm52-infer-testing/entrypoint.sh

ENTRYPOINT ["/opt/glm52-infer-testing/entrypoint.sh"]
