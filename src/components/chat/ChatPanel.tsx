import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ChatMessageItem } from './ChatMessage';

interface ChatPanelProps {
  onPageJump: (page: number) => void;
}

export function ChatPanel({ onPageJump }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, activePdf, isStreaming, isChatOpen, toggleChat, sendMessage } = useAppStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !activePdf) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(trimmed);
  }, [input, isStreaming, activePdf, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Collapsed state — show FAB
  if (!isChatOpen) {
    return (
      <button
        className="absolute right-6 bottom-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-[0_0_20px_rgba(167,139,250,0.25)] flex items-center justify-center hover:bg-surface-tint hover:scale-105 active:scale-95 transition-all duration-300 z-30 border border-primary-fixed"
        onClick={toggleChat}
        title="Open AI Chat"
      >
        <span className="material-symbols-outlined icon-fill">chat</span>
      </button>
    );
  }

  return (
    <section className="flex flex-col bg-surface border-l border-outline-variant h-full w-full lg:w-[400px] xl:w-[440px] shrink-0 animate-slide-in">
      {/* Header */}
      <div className="h-11 border-b border-outline-variant bg-surface-container-low flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse-slow" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[16px]">memory</span>
            <span className="text-sm font-semibold text-on-surface tracking-tight">Document Assistant</span>
          </div>
        </div>
        <button
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container p-1.5 rounded-md transition-colors"
          onClick={toggleChat}
          title="Collapse chat"
        >
          <span className="material-symbols-outlined text-[18px]">right_panel_close</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Session label */}
        {activePdf && (
          <div className="text-center">
            <span className="text-[10px] font-medium text-on-surface-variant/60 bg-surface-container-lowest/50 px-3 py-1 rounded-full border border-outline-variant/30 uppercase tracking-widest">
              {activePdf.name}
            </span>
          </div>
        )}

        {/* Greeting */}
        {messages.length === 0 && activePdf && (
          <div className="flex flex-col items-start gap-2 animate-fade-in">
            <div className="flex items-center gap-2 pl-1">
              <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[14px]">memory</span>
              </div>
              <span className="text-xs font-medium text-primary">Obsidian AI</span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%] leading-relaxed">
              <p className="mb-2">
                I've loaded <span className="text-primary font-mono text-xs bg-surface-container-high px-1.5 rounded">{activePdf.name}</span>.
              </p>
              <p>Ask me anything about this document — I'll search through it and cite the relevant pages.</p>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 pl-1 mt-1">
              {['Summarize this document', 'What are the key points?', 'List main topics'].map((s) => (
                <button
                  key={s}
                  className="bg-surface-container-low border border-outline-variant hover:border-primary/50 text-xs text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-full transition-all"
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} onPageJump={onPageJump} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-surface-dim/60 border-t border-outline-variant shrink-0">
        <div className="relative flex items-end bg-surface-container-lowest border border-outline-variant rounded-xl p-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={activePdf ? 'Ask about this document...' : 'Upload a PDF first...'}
            disabled={!activePdf || isStreaming}
            rows={1}
            className="w-full bg-transparent border-none text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:ring-0 px-2 py-2 max-h-32 min-h-[36px] disabled:opacity-50"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activePdf || isStreaming}
            className="p-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-all shrink-0 m-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center w-8 h-8"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-1.5 px-1">
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-semibold">
            {activePdf ? `Context: ${activePdf.pageCount ?? '?'} pages` : 'No document loaded'}
          </span>
          <span className="text-[10px] text-on-surface-variant/50">Enter to send</span>
        </div>
      </div>
    </section>
  );
}
