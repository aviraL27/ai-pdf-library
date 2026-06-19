import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PdfFile, ChatMessage, LayoutMode } from '../types';
import { fetchPdfs, deletePdf, fetchHistory, streamChat, uploadPdf } from '../api/client';

interface AppState {
  // Data
  pdfs: PdfFile[];
  activePdf: PdfFile | null;
  messages: ChatMessage[];

  // UI State
  isStreaming: boolean;
  currentPage: number;
  zoom: number;
  isChatOpen: boolean;
  layoutMode: LayoutMode;
  isUploading: boolean;
  uploadProgress: string;
  uploadError: string | null;
  isLoadingHistory: boolean;

  // Actions
  loadPdfs: () => Promise<void>;
  setActivePdf: (pdf: PdfFile) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  uploadFile: (file: File) => Promise<PdfFile | null>;
  removePdf: (id: string) => Promise<void>;
  setPage: (n: number) => void;
  setZoom: (z: number) => void;
  toggleChat: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  pdfs: [],
  activePdf: null,
  messages: [],
  isStreaming: false,
  currentPage: 1,
  zoom: 1.0,
  isChatOpen: true,
  layoutMode: 'split',
  isUploading: false,
  uploadProgress: '',
  uploadError: null,
  isLoadingHistory: false,

  // Load all PDFs
  loadPdfs: async () => {
    try {
      const pdfs = await fetchPdfs();
      set({ pdfs });
    } catch (err) {
      console.error('[store] loadPdfs error:', err);
    }
  },

  // Set active PDF + load its history
  setActivePdf: async (pdf: PdfFile) => {
    set({ activePdf: pdf, messages: [], currentPage: 1, isLoadingHistory: true });
    try {
      const history = await fetchHistory(pdf.id);
      set({ messages: history, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  // Send a chat message (streams response)
  sendMessage: async (message: string) => {
    const { activePdf, isStreaming } = get();
    if (!activePdf || isStreaming) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    const assistantId = uuidv4();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
    }));

    await streamChat(activePdf.id, message, {
      onToken: (token) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m
          ),
        }));
      },
      onDone: (citations) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, citations }
              : m
          ),
          isStreaming: false,
        }));
      },
      onError: (errMsg) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${errMsg}`, isStreaming: false }
              : m
          ),
          isStreaming: false,
        }));
      },
    });
  },

  // Upload a PDF file
  uploadFile: async (file: File) => {
    set({ isUploading: true, uploadProgress: 'Uploading...', uploadError: null });
    try {
      const pdf = await uploadPdf(file, (msg) => set({ uploadProgress: msg }));
      set((s) => ({
        pdfs: [pdf, ...s.pdfs],
        isUploading: false,
        uploadProgress: '',
      }));
      return pdf;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      set({ isUploading: false, uploadProgress: '', uploadError: msg });
      return null;
    }
  },

  // Delete a PDF
  removePdf: async (id: string) => {
    try {
      await deletePdf(id);
      set((s) => ({
        pdfs: s.pdfs.filter((p) => p.id !== id),
        activePdf: s.activePdf?.id === id ? null : s.activePdf,
        messages: s.activePdf?.id === id ? [] : s.messages,
      }));
    } catch (err) {
      console.error('[store] removePdf error:', err);
    }
  },

  setPage: (n) => set({ currentPage: n }),
  setZoom: (z) => set({ zoom: Math.max(0.5, Math.min(3.0, z)) }),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  clearMessages: () => set({ messages: [] }),
}));
