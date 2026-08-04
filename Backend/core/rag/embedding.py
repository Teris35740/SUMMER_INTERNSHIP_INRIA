import json

import weaviate.classes.config as wvc

from ..config import WEAVIATE_COLLECTION, WEAVIATE_EMBEDDING_DIM, get_model, get_weaviate_client


def embedding_db(chunks, model=None):
    if model is None:
        model = get_model()
    embeddings = model.encode(
        chunks,
        normalize_embeddings=True,
        convert_to_tensor=True,
        show_progress_bar=False,
    )
    return embeddings


def _ensure_collection_exists(client, collection_name=WEAVIATE_COLLECTION):
    """Crée la collection Weaviate si elle n'existe pas encore."""
    if not client.collections.exists(collection_name):
        client.collections.create(
            name=collection_name,
            vectorizer_config=wvc.Configure.Vectorizer.none(),
            properties=[
                wvc.Property(name="content", data_type=wvc.DataType.TEXT),
                wvc.Property(name="source_type", data_type=wvc.DataType.TEXT),
                wvc.Property(name="metadata_json", data_type=wvc.DataType.TEXT),
            ],
        )


def store_in_weaviate(chunk_records, embeddings, collection_name=WEAVIATE_COLLECTION):
    """Stocke les chunks avec leurs embeddings dans Weaviate.
    
    Remplace l'ancienne fonction store_embeddings_in_supabase.
    Les metadata sont sérialisées en JSON string car Weaviate ne supporte
    pas les objets JSONB imbriqués aussi facilement que PostgreSQL.
    """
    client = get_weaviate_client()
    _ensure_collection_exists(client, collection_name)

    collection = client.collections.get(collection_name)
    embs = embeddings.cpu().numpy()

    with collection.batch.dynamic() as batch:
        for record, emb in zip(chunk_records, embs):
            record_data = record.copy()

            content = record_data.pop("content")
            source_type = record_data.pop("source_type")

            properties = {
                "content": content,
                "source_type": source_type,
                "metadata_json": json.dumps(record_data, ensure_ascii=False),
            }

            batch.add_object(
                properties=properties,
                vector=emb.tolist(),
            )

    return {"status": "ok", "count": len(chunk_records)}
