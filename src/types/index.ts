// ── Shared types matching the backend API ─────────────────────────────────────

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

export interface Citation {
  page: number;
  chunkId: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  createdAt: string;
}

export type LayoutMode = 'split' | 'immersive';
