def re_ranking(rows, question, model):
    ranked_rows = []

    for row in rows:
        context = row["content"]
        score = float(model.predict([(question, context)])[0])
        ranked_row = dict(row)
        ranked_row["rerank_score"] = score
        ranked_rows.append(ranked_row)

    return sorted(ranked_rows, key=lambda item: item["rerank_score"], reverse=True)


def expansion_parent_child(rows):
    '''Si on a trouvé un enfant pertinent alors on transmet également le parents au llm ppur avoir plus de contexte.'''
    parent_rows = [row for row in rows if row.get("metadata", {}).get("chunk_index") == 0]
    child_rows = [row for row in rows if row.get("metadata", {}).get("chunk_index") != 0]

    expanded_rows = []

    for parent in parent_rows:
        parent_id = parent["id"]
        children = [child for child in child_rows if child.get("metadata", {}).get("parent_id") == parent_id]
        expanded_rows.extend([parent] + children)

    return expanded_rows


def build_context(rows):
    parts = []
    for row in rows:
        metadata = row.get("metadata") or {}
        source_type = row.get("source_type", "unknown")
        rerank_score = row.get("rerank_score")
        hybrid_score = row.get("hybrid_score", 0.0)

        page_number = metadata.get("page_number")
        chunk_index = metadata.get("chunk_index")
        source_file = metadata.get("source_file")
        fact_id = metadata.get("fact_id")

        header_parts = [
            f"source_type={source_type}",
            f"hybrid_score={hybrid_score:.6f}",
            f"dense_rank={row.get('dense_rank')} (score={row.get('dense_score', 0.0):.4f})",
            f"sparse_rank={row.get('sparse_rank')} (score={row.get('sparse_score', 0.0):.4f})",
        ]

        if rerank_score is not None:
            header_parts.append(f"rerank_score={rerank_score:.4f}")

        if source_file is not None:
            header_parts.append(f"source_file={source_file}")
        if fact_id is not None:
            header_parts.append(f"fact_id={fact_id}")
        if page_number is not None:
            header_parts.append(f"page={page_number}")
        if chunk_index is not None:
            header_parts.append(f"chunk={chunk_index}")

        parts.append(
            f"[{' | '.join(header_parts)}]\n"
            f"{row['content']}"
        )

    return "\n\n---\n\n".join(parts)
