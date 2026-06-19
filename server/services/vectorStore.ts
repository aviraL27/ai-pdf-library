import { ChromaClient } from "chromadb";
import type { Chunk, Citation } from "../types/index.js";

// ── Config ────────────────────────────────────────────────────────────────────
const CHROMA_HOST = process.env.CHROMA_HOST ?? "http://localhost:8000";
const TOP_K = 5;

// Parse host/port from env URL
function parseChromaUrl(url: string): { host: string; port: number; ssl: boolean } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || (parsed.protocol === "https:" ? "443" : "8000"), 10),
    ssl: parsed.protocol === "https:",
  };
}

let _client: ChromaClient | null = null;

function getClient(): ChromaClient {
  if (!_client) {
    const { host, port, ssl } = parseChromaUrl(CHROMA_HOST);
    _client = new ChromaClient({ host, port, ssl });
  }
  return _client;
}

// A no-op embedding function — we always supply pre-computed embeddings
// so ChromaDB never needs to call this, but v3 requires the field to be set.
const noopEmbeddingFunction = {
  name: "precomputed" as const,
  generate: async (texts: string[]): Promise<number[][]> =>
    texts.map(() => []),
};

// Collection name is scoped per PDF (UUIDs contain hyphens → replace with underscores)
function collectionName(pdfId: string): string {
  return `pdf_${pdfId.replace(/-/g, "_")}`;
}

// ── Create / get collection for a PDF ────────────────────────────────────────
async function getOrCreateCollection(pdfId: string) {
  const client = getClient();
  return client.getOrCreateCollection({
    name: collectionName(pdfId),
    embeddingFunction: noopEmbeddingFunction,
    metadata: { "hnsw:space": "cosine" },
  });
}

// ── Store embedded chunks ─────────────────────────────────────────────────────
export async function storeChunks(
  pdfId: string,
  items: { chunk: Chunk; embedding: number[] }[]
): Promise<void> {
  const collection = await getOrCreateCollection(pdfId);

  const ids = items.map((i) => i.chunk.id);
  const embeddings = items.map((i) => i.embedding);
  const documents = items.map((i) => i.chunk.text);
  const metadatas = items.map((i) => ({
    pdfId: i.chunk.pdfId,
    chunkIndex: i.chunk.chunkIndex,
    page: i.chunk.pageNumber,
  }));

  // Upsert in batches of 100 to stay within safe limits
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    await collection.upsert({
      ids: ids.slice(i, i + BATCH),
      embeddings: embeddings.slice(i, i + BATCH),
      documents: documents.slice(i, i + BATCH),
      metadatas: metadatas.slice(i, i + BATCH),
    });
  }
}

// ── Query: return top-K similar chunks as citations ───────────────────────────
export async function querySimilar(
  pdfId: string,
  queryEmbedding: number[],
  topK: number = TOP_K
): Promise<Citation[]> {
  const collection = await getOrCreateCollection(pdfId);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const citations: Citation[] = [];
  const ids = results.ids[0] ?? [];
  const docs = results.documents[0] ?? [];
  const metas = results.metadatas[0] ?? [];

  for (let i = 0; i < ids.length; i++) {
    const meta = metas[i] as Record<string, string | number> | null;
    citations.push({
      chunkId: ids[i],
      page: (meta?.page as number) ?? 0,
      snippet: (docs[i] ?? "").slice(0, 200),
    });
  }

  return citations;
}

// ── Delete all chunks for a PDF ───────────────────────────────────────────────
export async function deleteCollection(pdfId: string): Promise<void> {
  const client = getClient();
  try {
    await client.deleteCollection({ name: collectionName(pdfId) });
  } catch (err: any) {
    // Ignore "not found" errors
    if (!err?.message?.toLowerCase().includes("not found")) {
      throw err;
    }
  }
}

// ── Health check ──────────────────────────────────────────────────────────────
export async function checkChromaHealth(): Promise<boolean> {
  try {
    const client = getClient();
    await client.heartbeat();
    return true;
  } catch {
    return false;
  }
}
