-- Convert embedding column from text to proper vector type
ALTER TABLE public.documents
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::vector(1536);

-- match_documents: semantic similarity search used by n8n RAG vector store
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding   vector(1536),
  match_count       int     DEFAULT 8,
  filter            jsonb   DEFAULT '{}'
)
RETURNS TABLE (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id::bigint,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE (filter = '{}' OR d.metadata @> filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
