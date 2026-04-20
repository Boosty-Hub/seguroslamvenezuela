const CHUNK_SIZE = 1000;
const OVERLAP = 200;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    let chunkEnd = end;

    // Try to break at a sentence boundary
    if (end < normalized.length) {
      const lastPeriod = normalized.lastIndexOf(".", end);
      const lastNewline = normalized.lastIndexOf("\n", end);
      const boundary = Math.max(lastPeriod, lastNewline);
      if (boundary > start + CHUNK_SIZE / 2) {
        chunkEnd = boundary + 1;
      }
    }

    const chunk = normalized.slice(start, chunkEnd).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) break;
    start = chunkEnd - OVERLAP;
    if (start >= normalized.length) break;
  }

  return chunks;
}
