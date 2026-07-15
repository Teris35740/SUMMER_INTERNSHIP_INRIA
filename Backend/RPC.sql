CREATE OR REPLACE FUNCTION match_documents_keyword(
  query_text text,
  match_count int default 5,
  filter_source_type varchar default null,
  filter_patient_id text default null
)
RETURNS TABLE (
  id bigint,
  content text,
  source_type varchar,
  metadata jsonb,
  score float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    content,
    source_type,
    metadata,
    ts_rank(fts_vector, websearch_to_tsquery('simple', query_text)) as score
  FROM documents_rag
  WHERE
    fts_vector @@ websearch_to_tsquery('simple', query_text)
    AND (filter_source_type IS NULL OR source_type = filter_source_type)
    AND (filter_patient_id IS NULL OR metadata->>'patient_id' = filter_patient_id)
  ORDER BY score DESC
  LIMIT match_count;
$$;

create or replace function match_documents_vector(
  query_embedding vector(768),
  match_count int default 5,
  filter_source_type varchar default null,
  filter_patient_id text default null
)
returns table (
  id bigint,
  content text,
  source_type varchar,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    id,
    content,
    source_type,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents_rag
  where
    (filter_source_type is null or source_type = filter_source_type)
    and (filter_patient_id is null or metadata->>'patient_id' = filter_patient_id)
  order by embedding <=> query_embedding
  limit match_count;
$$;