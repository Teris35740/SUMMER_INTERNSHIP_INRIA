from supabase import create_client

from core.config import SUPABASE_DOCUMENTS_TABLE, _model, normalize_supabase_url


def embedding_db(chunks, model=None):
    if model is None:
        model = _model
    embeddings = model.encode(
        chunks,
        normalize_embeddings=True,
        convert_to_tensor=True,
        show_progress_bar=False,
    )
    return embeddings


def store_embeddings_in_supabase(chunk_records, embeddings, supabase_url, supabase_key, table_name=SUPABASE_DOCUMENTS_TABLE):
    supabase_url = normalize_supabase_url(supabase_url)
    supabase = create_client(supabase_url, supabase_key)

    rows = []
    embs = embeddings.cpu().numpy()

    for record, emb in zip(chunk_records, embs):
        record_data = record.copy()

        content = record_data.pop("content")
        source_type = record_data.pop("source_type")

        rows.append({
            "content": content,
            "embedding": emb.tolist(),
            "source_type": source_type,
            "metadata": record_data,
        })

    response = supabase.table(table_name).insert(rows).execute()
    return response
