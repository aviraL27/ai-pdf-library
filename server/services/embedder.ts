import axios from "axios";
import type { Chunk } from "../types/index.js";

// ── Config ────────────────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL ?? "nomic-embed-text";
const CONCURRENCY = 5; // simultaneous embedding requests

// ── Single chunk embedding ────────────────────────────────────────────────────
export async function embedText(text: string): Promise<number[]> {
  const response = await axios.post<{ embedding: number[] }>(
    `${OLLAMA_BASE}/api/embeddings`,
    { model: EMBED_MODEL, prompt: text },
    { timeout: 30_000 }
  );
  return response.data.embedding;
}

// ── Batch embedding with concurrency limit ────────────────────────────────────
export async function embedChunks(
  chunks: Chunk[],
  onProgress?: (done: number, total: number) => void
): Promise<{ chunk: Chunk; embedding: number[] }[]> {
  const results: { chunk: Chunk; embedding: number[] }[] = new Array(
    chunks.length
  );

  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < chunks.length) {
      const current = index++;
      const chunk = chunks[current];
      const embedding = await embedText(chunk.text);
      results[current] = { chunk, embedding };
      completed++;
      onProgress?.(completed, chunks.length);
    }
  }

  // Spin up CONCURRENCY workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

// ── Health check ──────────────────────────────────────────────────────────────
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${OLLAMA_BASE}/api/tags`, {
      timeout: 5_000,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}
