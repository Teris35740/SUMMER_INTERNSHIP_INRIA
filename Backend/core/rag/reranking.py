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
    '''
    Remplace le contenu du chunk par son parent pour donner plus de contexte au LLM.
    On ne le fait que pour les documents de type 'reference' (les PDF), pas pour les 'patient' (JSON).
    On s'assure aussi de ne pas dupliquer les parents si plusieurs enfants du même parent ont été trouvés.
    '''
    expanded_rows = []
    seen_parents = set()

    for row in rows:
        source_type = row.get("source_type", "")
        metadata = row.get("metadata", {})
        
        if source_type != "patient":
            parent_content = metadata.get("parent_content")
            
            if parent_content:
                parent_id = metadata.get("parent_id")
                source_file = metadata.get("source_file")
                parent_key = f"{source_file}_{parent_id}"
                
                if parent_key not in seen_parents:
                    seen_parents.add(parent_key)
                    new_row = dict(row)
                    new_row["content"] = parent_content
                    expanded_rows.append(new_row)
                continue
        expanded_rows.append(row)

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
