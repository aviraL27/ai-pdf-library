// ─── Shared TypeScript interfaces for the PDF RAG backend ───────────────────

export interface PdfFile {
  id: string;
  name: string;
  originalName: string;
  filePath: string;
  pageCount: number | null;
  chunkCount: number | null;
  fileSize: number | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  pdfId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  createdAt: string;
}

export interface Citation {
  page: number;
  chunkId: string;
  snippet: string;
}

export interface Chunk {
  id: string;
  pdfId: string;
  chunkIndex: number;
  pageNumber: number;
  text: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    num_ctx?: number;
    temperature?: number;
    top_p?: number;
  };
}

export interface ChromaQueryResult {
  ids: string[][];
  documents: (string | null)[][];
  metadatas: (Record<string, string | number | boolean> | null)[][];
  distances: number[][];
}

export interface HealthStatus {
  status: "ok" | "degraded";
  ollama: boolean;
  chromadb: boolean;
  sqlite: boolean;
}

// SSE event shapes sent from /api/chat
export type SSEEvent =
  | { type: "token"; token: string }
  | { type: "done"; citations: Citation[] }
  | { type: "error"; message: string };
