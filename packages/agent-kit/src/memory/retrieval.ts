import { TenantDb } from '@repo/core';

export interface RetrievedSource {
  sourceId: string;
  title: string;
  content: string;
  citation: string;
  score: number;
}

export class KnowledgeRetrieval {
  /**
   * Computes cosine similarity between two numeric embedding vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Searches tenant knowledge chunks by semantic vector or keywords
   */
  public static async search(
    db: TenantDb,
    query: string,
    queryEmbedding?: number[],
    limit: number = 3
  ): Promise<RetrievedSource[]> {
    const chunks = await db.findMany<any>('kb_chunks');
    const sources = await db.findMany<any>('kb_sources');
    const sourceMap = new Map<string, string>();
    for (const s of sources) {
      sourceMap.set(s.id, s.name);
    }

    const scored: RetrievedSource[] = [];

    for (const chunk of chunks) {
      let score = 0;

      if (queryEmbedding && chunk.embedding) {
        score = KnowledgeRetrieval.cosineSimilarity(queryEmbedding, chunk.embedding);
      } else {
        // Keyword fallback matching
        const words = query.toLowerCase().split(/\s+/);
        const content = (chunk.content || '').toLowerCase();
        let matches = 0;
        for (const w of words) {
          if (w.length > 2 && content.includes(w)) matches++;
        }
        score = words.length > 0 ? matches / words.length : 0;
      }

      if (score > 0.1 || !queryEmbedding) {
        const title = sourceMap.get(chunk.source_id) || 'Knowledge Base';
        scored.push({
          sourceId: chunk.source_id,
          title,
          content: chunk.content,
          citation: `Source: "${title}"`,
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}
