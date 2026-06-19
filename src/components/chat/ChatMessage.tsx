import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../../types';
import { CitationBadge } from './CitationBadge';

interface ChatMessageProps {
  message: ChatMessageType;
  onPageJump: (page: number) => void;
}

export function ChatMessageItem({ message, onPageJump }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 w-full animate-fade-in">
        <div className="bg-surface-container-highest border border-outline-variant text-on-surface px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%] leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 w-full animate-fade-in">
      {/* AI label */}
      <div className="flex items-center gap-2 pl-1">
        <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[14px]">memory</span>
        </div>
        <span className="text-xs font-medium text-primary">Obsidian AI</span>
        {message.citations && message.citations.length > 0 && (
          <span className="text-[10px] bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded border border-tertiary/20">
            Referencing {message.citations.length} chunk{message.citations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`bg-surface-container-lowest border border-outline-variant text-on-surface-variant px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%] leading-relaxed shadow-sm ${
          message.isStreaming ? 'streaming-cursor' : ''
        }`}
      >
        {message.content ? (
          <div className="chat-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Citations */}
      {!message.isStreaming && message.citations && message.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1 mt-1">
          {message.citations.map((c) => (
            <CitationBadge key={c.chunkId} citation={c} onPageJump={onPageJump} />
          ))}
        </div>
      )}
    </div>
  );
}
