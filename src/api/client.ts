import type { PdfFile, Citation, ChatMessage } from '../types';

const BASE = '/api';

// ── PDFs ───────────────────────────────────────────────────────────────────────

export async function fetchPdfs(): Promise<PdfFile[]> {
  const res = await fetch(`${BASE}/pdfs`);
  if (!res.ok) throw new Error('Failed to fetch PDFs');
  const data = await res.json();
  return data.pdfs;
}

export async function fetchPdfById(id: string): Promise<PdfFile> {
  const res = await fetch(`${BASE}/pdfs/${id}`);
  if (!res.ok) throw new Error('PDF not found');
  const data = await res.json();
  return data.pdf;
}

export async function deletePdf(id: string): Promise<void> {
  const res = await fetch(`${BASE}/pdfs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete PDF');
}

// ── Upload ─────────────────────────────────────────────────────────────────────

export async function uploadPdf(
  file: File,
  onProgress?: (msg: string) => void
): Promise<PdfFile> {
  onProgress?.('Uploading file...');
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }

  onProgress?.('Processing complete');
  return res.json();
}

// ── Chat History ───────────────────────────────────────────────────────────────

export async function fetchHistory(pdfId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/history/${pdfId}`);
  if (!res.ok) return [];
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.history.map((m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations ?? undefined,
    createdAt: m.createdAt,
  }));
}

export async function clearHistory(pdfId: string): Promise<void> {
  await fetch(`${BASE}/history/${pdfId}`, { method: 'DELETE' });
}

// ── Chat (SSE Streaming) ───────────────────────────────────────────────────────

export interface ChatStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (citations: Citation[]) => void;
  onError: (message: string) => void;
}

export async function streamChat(
  pdfId: string,
  message: string,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfId, message }),
  });

  if (!res.ok || !res.body) {
    callbacks.onError('Chat request failed');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'token') {
          callbacks.onToken(event.token);
        } else if (event.type === 'done') {
          callbacks.onDone(event.citations ?? []);
        } else if (event.type === 'error') {
          callbacks.onError(event.message);
        }
      } catch {
        // ignore malformed events
      }
    }
  }
}

// ── Health ─────────────────────────────────────────────────────────────────────

export async function fetchHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
