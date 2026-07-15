from core.config import LAYER_WEIGHTS, SUPABASE_KEYWORD_RPC, SUPABASE_VECTOR_RPC


def embed_question(question, model):
    return model.encode(
        question,
        normalize_embeddings=True,
        convert_to_tensor=False,
        show_progress_bar=False,
    ).tolist()


def search_vector(supabase, query_embedding, match_count=5, filter_source_type=None, filter_patient_id=None):
    return supabase.rpc(
        SUPABASE_VECTOR_RPC,
        {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "filter_source_type": filter_source_type,
            "filter_patient_id": filter_patient_id,
        },
    ).execute().data


def search_keyword(supabase, query_text, match_count=5, filter_source_type=None, filter_patient_id=None):
    return supabase.rpc(
        SUPABASE_KEYWORD_RPC,
        {
            "query_text": query_text,
            "match_count": match_count,
            "filter_source_type": filter_source_type,
            "filter_patient_id": filter_patient_id,
        },
    ).execute().data


def fusion_rows(supabase, query_embedding, question, match_count=10, alpha=0.5, k=60):
    """Récupération hybride stratifiée.

    Score : s_hyb(d_i, q_t) = λ(d_i) * ( α / (k + r_dense(d_i)) + (1 - α) / (k + r_sparse(d_i)) )

    - r_dense  = rang dans la recherche vectorielle (dense)
    - r_sparse = rang dans la recherche keyword (sparse)
    - α ∈ [0,1] équilibre dense / sparse
    - k = 60, constante technique RRF
    - λ(d_i) donne davantage de poids aux fragments du dossier patient
    """
    vector_rows = search_vector(supabase, query_embedding, match_count=match_count)
    keyword_rows = search_keyword(supabase, question, match_count=match_count)

    dense_rank = {row["id"]: rank for rank, row in enumerate(vector_rows, start=1)}
    sparse_rank = {row["id"]: rank for rank, row in enumerate(keyword_rows, start=1)}
    dense_score = {row["id"]: row.get("similarity", 0.0) for row in vector_rows}
    sparse_score = {row["id"]: row.get("score", 0.0) for row in keyword_rows}

    all_docs = {}
    for row in vector_rows + keyword_rows:
        if row["id"] not in all_docs:
            all_docs[row["id"]] = {
                "id": row["id"],
                "content": row["content"],
                "source_type": row["source_type"],
                "metadata": row.get("metadata") or {},
            }

    default_rank = match_count + 1

    scored_rows = []
    for doc_id, doc in all_docs.items():
        r_dense = dense_rank.get(doc_id, default_rank)
        r_sparse = sparse_rank.get(doc_id, default_rank)
        lam = LAYER_WEIGHTS.get(doc["source_type"], 1.0)

        s_hyb = lam * (alpha / (k + r_dense) + (1 - alpha) / (k + r_sparse))

        doc["hybrid_score"] = s_hyb
        doc["dense_rank"] = r_dense
        doc["sparse_rank"] = r_sparse
        doc["dense_score"] = dense_score.get(doc_id, 0.0)
        doc["sparse_score"] = sparse_score.get(doc_id, 0.0)
        scored_rows.append(doc)

    return sorted(scored_rows, key=lambda x: x["hybrid_score"], reverse=True)
