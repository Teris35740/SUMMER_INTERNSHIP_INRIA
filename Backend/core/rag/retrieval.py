import json

import weaviate.classes.query as wvq

from ..config import LAYER_WEIGHTS, WEAVIATE_COLLECTION, get_weaviate_client


def embed_question(question, model):
    return model.encode(
        question,
        normalize_embeddings=True,
        convert_to_tensor=False,
        show_progress_bar=False,
    ).tolist()


def _build_weaviate_filters(filter_source_type=None, filter_patient_id=None):
    """Construit les filtres Weaviate à partir des paramètres optionnels."""
    filters = []
    if filter_source_type:
        filters.append(
            wvq.Filter.by_property("source_type").equal(filter_source_type)
        )
    if filter_patient_id:
        # Le patient_id est dans le JSON des metadata, on filtre via metadata_json contenant le patient_id
        filters.append(
            wvq.Filter.by_property("metadata_json").contains_any([filter_patient_id])
        )

    if not filters:
        return None
    if len(filters) == 1:
        return filters[0]
    # Combine avec AND
    combined = filters[0]
    for f in filters[1:]:
        combined = combined & f
    return combined


def _parse_weaviate_object(obj):
    """Convertit un objet Weaviate en dict compatible avec le format attendu par le pipeline."""
    props = obj.properties
    metadata = {}
    if props.get("metadata_json"):
        try:
            metadata = json.loads(props["metadata_json"])
        except (json.JSONDecodeError, TypeError):
            metadata = {}

    return {
        "id": str(obj.uuid),
        "content": props.get("content", ""),
        "source_type": props.get("source_type", "unknown"),
        "metadata": metadata,
    }


def search_vector(query_embedding, match_count=5, filter_source_type=None, filter_patient_id=None):
    """Recherche vectorielle via Weaviate near_vector."""
    client = get_weaviate_client()
    collection = client.collections.get(WEAVIATE_COLLECTION)

    filters = _build_weaviate_filters(filter_source_type, filter_patient_id)

    response = collection.query.near_vector(
        near_vector=query_embedding,
        limit=match_count,
        filters=filters,
        return_metadata=wvq.MetadataQuery(distance=True),
    )

    results = []
    for obj in response.objects:
        doc = _parse_weaviate_object(obj)
        # Weaviate retourne distance (0 = identique), on convertit en similarité (1 - distance)
        doc["similarity"] = 1.0 - (obj.metadata.distance or 0.0)
        results.append(doc)

    return results


def search_bm25(query_text, match_count=5, filter_source_type=None, filter_patient_id=None):
    """Recherche BM25 native via Weaviate."""
    client = get_weaviate_client()
    collection = client.collections.get(WEAVIATE_COLLECTION)

    filters = _build_weaviate_filters(filter_source_type, filter_patient_id)

    response = collection.query.bm25(
        query=query_text,
        query_properties=["content"],
        limit=match_count,
        filters=filters,
        return_metadata=wvq.MetadataQuery(score=True),
    )

    results = []
    for obj in response.objects:
        doc = _parse_weaviate_object(obj)
        doc["score"] = obj.metadata.score or 0.0
        results.append(doc)

    return results


def fusion_rows(query_embedding, question, match_count=10, alpha=0.5, k=60, filter_source_type=None, filter_patient_id=None):
    """Récupération hybride stratifiée.

    Score : s_hyb(d_i, q_t) = λ(d_i) * ( α / (k + r_dense(d_i)) + (1 - α) / (k + r_sparse(d_i)) )

    - r_dense  = rang dans la recherche vectorielle (dense)
    - r_sparse = rang dans la recherche BM25 (sparse)
    - α ∈ [0,1] équilibre dense / sparse
    - k = 60, constante technique RRF
    - λ(d_i) donne davantage de poids aux fragments du dossier patient
    """
    vector_rows = search_vector(query_embedding, match_count=match_count, filter_source_type=filter_source_type, filter_patient_id=filter_patient_id)
    bm25_rows = search_bm25(question, match_count=match_count, filter_source_type=filter_source_type, filter_patient_id=filter_patient_id)

    dense_rank = {row["id"]: rank for rank, row in enumerate(vector_rows, start=1)}
    sparse_rank = {row["id"]: rank for rank, row in enumerate(bm25_rows, start=1)}
    dense_score = {row["id"]: row.get("similarity", 0.0) for row in vector_rows}
    sparse_score = {row["id"]: row.get("score", 0.0) for row in bm25_rows}

    all_docs = {}
    for row in vector_rows + bm25_rows:
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
