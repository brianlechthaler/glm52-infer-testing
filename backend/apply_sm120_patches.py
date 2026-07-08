#!/usr/bin/env python3
"""Apply runtime patches for vLLM 0.24.x on SM12.0 (RTX PRO 6000).

Stock vLLM enables DeepGEMM on family-120, but the bundled DeepGEMM build only
ships SM90/SM100 kernels. GLM 5.2 sparse-indexer startup then aborts during CUDA
graph profiling with:

  Assertion error (.../attention.hpp:219): Unsupported architecture
"""

from __future__ import annotations

import sys
from pathlib import Path

VLLM_ROOT = Path("/usr/local/lib/python3.12/dist-packages/vllm")


def patch_file(rel_path: str, old: str, new: str, label: str) -> None:
    path = VLLM_ROOT / rel_path
    text = path.read_text()
    if new in text:
        print(f"[sm120] {label}: already patched")
        return
    if old not in text:
        raise SystemExit(f"[sm120] {label}: expected snippet missing in {path}")
    path.write_text(text.replace(old, new, 1))
    print(f"[sm120] {label}: patched {path}")


def main() -> None:
    patch_file(
        "platforms/cuda.py",
        """        return (
            cls.is_device_capability(90)
            or cls.is_device_capability_family(100)
            or cls.is_device_capability_family(120)
        )""",
        """        # SM12.0 (RTX PRO 6000) lacks working DeepGEMM sparse-indexer kernels.
        return (
            cls.is_device_capability(90)
            or cls.is_device_capability_family(100)
        )""",
        "exclude SM120 from support_deep_gemm",
    )

    indexer_helper = '''
def _uses_deep_gemm_scheduler_metadata() -> bool:
    return (
        current_platform.is_cuda()
        and has_deep_gemm()
        and not current_platform.is_device_capability_family(120)
    )


'''

    patch_file(
        "v1/attention/backends/mla/indexer.py",
        "@triton.jit",
        indexer_helper + "@triton.jit",
        "add _uses_deep_gemm_scheduler_metadata helper",
    )

    patch_file(
        "v1/attention/backends/mla/indexer.py",
        "            if current_platform.is_cuda() and has_deep_gemm():",
        "            if _uses_deep_gemm_scheduler_metadata():",
        "skip DeepGEMM scheduler metadata on SM120",
    )

    patch_file(
        "utils/deep_gemm.py",
        """    _lazy_init()
    if _get_paged_mqa_logits_metadata_impl is None:
        return _missing()
    return _get_paged_mqa_logits_metadata_impl(context_lens, block_size, num_sms)""",
        """    if current_platform.is_device_capability_family(120):
        # DeepGEMM metadata kernels are SM90/SM100-only; indexer skips these on SM120.
        return torch.empty(0, device=context_lens.device, dtype=torch.int32)
    _lazy_init()
    if _get_paged_mqa_logits_metadata_impl is None:
        return _missing()
    return _get_paged_mqa_logits_metadata_impl(context_lens, block_size, num_sms)""",
        "guard get_paged_mqa_logits_metadata on SM120",
    )

    patch_file(
        "utils/deep_gemm.py",
        """    _lazy_init()
    if _fp8_fp4_mqa_logits_impl is None:
        return _missing()
    return _fp8_fp4_mqa_logits_impl(
        q,
        kv,
        weights,
        cu_seqlen_ks,
        cu_seqlen_ke,
        clean_logits=clean_logits,
    )""",
        """    if current_platform.is_device_capability_family(120) and q[1] is None:
        q_values = q[0].to(torch.float32)
        k_values, k_scales = kv
        k_values = k_values.to(torch.float32)
        if k_scales is not None:
            k_scales = k_scales.to(torch.float32)
            if k_scales.ndim > 1:
                k_scales = k_scales.squeeze(-1)
            k_mat = k_values * k_scales.unsqueeze(-1)
        else:
            k_mat = k_values
        while k_mat.ndim > 2:
            k_mat = k_mat.squeeze(1)
        num_rows = q_values.shape[0]
        num_cols = k_mat.shape[0]
        w = weights[:num_rows].to(torch.float32)
        if q_values.ndim == 2:
            scores = (q_values @ k_mat.T) * w.sum(dim=-1, keepdim=True)
        else:
            scores = torch.einsum("mhd,nd,mh->mn", q_values, k_mat, w)
        logits = torch.full(
            (num_rows, num_cols),
            float("-inf"),
            device=q_values.device,
            dtype=torch.float32,
        )
        for row in range(num_rows):
            start = int(cu_seqlen_ks[row].item())
            end = int(cu_seqlen_ke[row].item())
            if end > start:
                logits[row, start:end] = scores[row, start:end]
        if clean_logits:
            for row in range(num_rows):
                end = int(cu_seqlen_ke[row].item())
                if end < num_cols:
                    logits[row, end:].fill_(float("-inf"))
        return logits
    _lazy_init()
    if _fp8_fp4_mqa_logits_impl is None:
        return _missing()
    return _fp8_fp4_mqa_logits_impl(
        q,
        kv,
        weights,
        cu_seqlen_ks,
        cu_seqlen_ke,
        clean_logits=clean_logits,
    )""",
        "add SM120 FP8 MQA PyTorch fallback",
    )

    patch_file(
        "utils/deep_gemm.py",
        """    _lazy_init()
    if _fp8_fp4_paged_mqa_logits_impl is None:
        return _missing()
    return _fp8_fp4_paged_mqa_logits_impl(
        q,
        kv_cache,
        weights,
        context_lens,
        block_tables,
        schedule_metadata,
        max_model_len,
        clean_logits=clean_logits,
    )""",
        """    if current_platform.is_device_capability_family(120) and q[1] is None:
        # FP8-Q sparse indexer decode: fall back to PyTorch until DeepGEMM ships SM120.
        q_values = q[0]
        batch = context_lens.shape[0]
        next_n = q_values.shape[1]
        num_rows = batch * next_n
        logits = torch.full(
            (num_rows, max_model_len),
            float("-inf"),
            device=q_values.device,
            dtype=torch.float32,
        )
        head_dim = q_values.shape[-1]
        q_flat = q_values.reshape(num_rows, *q_values.shape[2:]).to(torch.float32)
        w_flat = weights[:num_rows].to(torch.float32)
        block_size = kv_cache.shape[1]
        for b in range(batch):
            ctx = int(context_lens[b, -1].item() if context_lens.ndim == 2 else context_lens[b].item())
            ctx = min(ctx, max_model_len)
            if ctx <= 0:
                continue
            blocks = block_tables[b]
            k_rows = []
            for pos in range(ctx):
                block_idx = pos // block_size
                block_off = pos % block_size
                physical = int(blocks[block_idx].item())
                slot = kv_cache[physical, block_off]
                k_fp8 = slot[..., :head_dim].view(torch.float8_e4m3fn)
                scale = slot[..., head_dim:].view(torch.float32)
                k_rows.append(k_fp8.to(torch.float32) * scale)
            k_mat = torch.stack(k_rows, dim=0)
            while k_mat.ndim > 2:
                k_mat = k_mat.squeeze(1)
            for n in range(next_n):
                row = b * next_n + n
                q_row = q_flat[row]
                if q_row.ndim == 1:
                    scores = (q_row.unsqueeze(0) * k_mat).sum(dim=-1) * w_flat[row].sum()
                else:
                    scores = torch.einsum("hd,nd,h->n", q_row, k_mat, w_flat[row])
                logits[row, :ctx] = scores
        if clean_logits:
            logits[:, max_model_len:].fill_(float("-inf"))
        return logits
    _lazy_init()
    if _fp8_fp4_paged_mqa_logits_impl is None:
        return _missing()
    return _fp8_fp4_paged_mqa_logits_impl(
        q,
        kv_cache,
        weights,
        context_lens,
        block_tables,
        schedule_metadata,
        max_model_len,
        clean_logits=clean_logits,
    )""",
        "add SM120 FP8 paged MQA PyTorch fallback",
    )

    patch_file(
        "model_executor/layers/sparse_attn_indexer.py",
        """        use_cooperative_topk = (
            current_platform.is_cuda()
            and topk_tokens in (512, 1024, 2048)
            and num_rows <= 32
            and logits.stride(0) % 4 == 0  # TMA 16-byte alignment
            and current_platform.has_device_capability(90)
        )
        use_persistent_topk = current_platform.is_cuda() and topk_tokens in (
            512,
            1024,
            2048,
        )""",
        """        use_cooperative_topk = (
            current_platform.is_cuda()
            and topk_tokens in (512, 1024, 2048)
            and num_rows <= 32
            and logits.stride(0) % 4 == 0  # TMA 16-byte alignment
            and current_platform.has_device_capability(90)
            and not current_platform.is_device_capability_family(120)
        )
        use_persistent_topk = (
            current_platform.is_cuda()
            and topk_tokens in (512, 1024, 2048)
            and not current_platform.is_device_capability_family(120)
        )""",
        "disable cooperative/persistent topk on SM120",
    )

    upconvert_helper = '''

def _upconvert_fp8_ds_mla_cache(cache: torch.Tensor) -> torch.Tensor:
    """Unpack fp8_ds_mla pages (656 B/token) to bf16 MLA layout (576)."""
    packed = cache.view(torch.uint8) if cache.dtype == torch.uint8 else cache.contiguous().view(torch.uint8)
    if packed.shape[-1] != 656:
        raise ValueError(
            f"Expected fp8_ds_mla packed width 656, got {packed.shape[-1]}"
        )
    prefix = packed.shape[:-1]
    nope = packed[..., :512].contiguous().view(torch.float8_e4m3fn).to(torch.float32)
    scales = packed[..., 512:528].contiguous().view(torch.float32)
    rope = packed[..., 528:656].contiguous().view(torch.bfloat16)
    scales = scales.unsqueeze(-1).expand(*prefix, 4, 128).reshape(*prefix, 512)
    return torch.cat([(nope * scales).to(torch.bfloat16), rope], dim=-1)


'''

    patch_file(
        "v1/attention/backends/mla/flashinfer_mla_sparse_sm120.py",
        "class FlashInferMLASparseSM120Impl(SparseMLAAttentionImpl[FlashInferMLASparseMetadata]):",
        upconvert_helper
        + "class FlashInferMLASparseSM120Impl(SparseMLAAttentionImpl[FlashInferMLASparseMetadata]):",
        "add fp8_ds_mla upconvert helper",
    )

    patch_file(
        "v1/attention/backends/mla/flashinfer_mla_sparse_sm120.py",
        """        topk_indices_physical = cast(
            torch.Tensor,
            triton_convert_req_index_to_global_index(
                attn_metadata.req_id_per_token[:num_actual_toks],
                attn_metadata.block_table,
                topk_indices,
                BLOCK_SIZE=attn_metadata.block_size,
                NUM_TOPK_TOKENS=topk_indices.shape[1],
            ),
        )""",
        """        topk_indices_physical, seq_lens = cast(
            tuple[torch.Tensor, torch.Tensor],
            triton_convert_req_index_to_global_index(
                attn_metadata.req_id_per_token[:num_actual_toks],
                attn_metadata.block_table,
                topk_indices,
                BLOCK_SIZE=attn_metadata.block_size,
                NUM_TOPK_TOKENS=topk_indices.shape[1],
                return_valid_counts=True,
            ),
        )""",
        "collect seq_lens for FlashInfer sparse MLA decode",
    )

    patch_file(
        "v1/attention/backends/mla/flashinfer_mla_sparse_sm120.py",
        """        out = flashinfer_trtllm_batch_decode_with_kv_cache_mla(
            query=q.unsqueeze(1),
            kv_cache=kv_c_and_k_pe_cache.view(torch.uint8).unsqueeze(1),
            workspace_buffer=self._workspace_buffer,
            qk_nope_head_dim=self.qk_nope_head_dim,
            kv_lora_rank=self.kv_lora_rank,
            qk_rope_head_dim=self.qk_rope_head_dim,
            block_tables=topk_indices_physical.unsqueeze(1),
            seq_lens=None,
            max_seq_len=attn_metadata.topk_tokens,
            out=output.unsqueeze(1),
            bmm1_scale=self.scale,
            bmm2_scale=1.0,
            sparse_mla_top_k=attn_metadata.topk_tokens,
            kv_scale_format=self.kv_scale_format,
        )""",
        """        # FlashInfer 0.6.x expects bf16 MLA pages (576), not packed fp8_ds_mla (656).
        kv_cache_bf16 = _upconvert_fp8_ds_mla_cache(kv_c_and_k_pe_cache)
        out = flashinfer_trtllm_batch_decode_with_kv_cache_mla(
            query=q.unsqueeze(1),
            kv_cache=kv_cache_bf16.unsqueeze(1),
            workspace_buffer=self._workspace_buffer,
            qk_nope_head_dim=self.qk_nope_head_dim,
            kv_lora_rank=self.kv_lora_rank,
            qk_rope_head_dim=self.qk_rope_head_dim,
            block_tables=topk_indices_physical.unsqueeze(1),
            seq_lens=seq_lens,
            max_seq_len=attn_metadata.topk_tokens,
            out=output.unsqueeze(1),
            bmm1_scale=self.scale,
            bmm2_scale=1.0,
            sparse_mla_top_k=attn_metadata.topk_tokens,
            backend="trtllm-gen",
        )""",
        "upconvert fp8_ds_mla KV before FlashInfer sparse MLA decode",
    )

    patch_file(
        "v1/attention/backends/mla/flashinfer_mla_sparse_sm120.py",
        "            seq_lens=None,",
        "            seq_lens=seq_lens,",
        "wire seq_lens into FlashInfer sparse MLA decode",
    )

    patch_file(
        "v1/attention/backends/mla/flashinfer_mla_sparse_sm120.py",
        "            sparse_mla_top_k=attn_metadata.topk_tokens,\n        )",
        "            sparse_mla_top_k=attn_metadata.topk_tokens,\n            backend=\"trtllm-gen\",\n        )",
        "force trtllm-gen for sparse MLA on SM120",
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"[sm120] patch failed: {exc}", file=sys.stderr)
        raise
