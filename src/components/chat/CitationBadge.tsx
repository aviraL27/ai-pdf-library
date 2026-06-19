import type { Citation } from '../../types';

interface CitationBadgeProps {
  citation: Citation;
  onPageJump: (page: number) => void;
}

export function CitationBadge({ citation, onPageJump }: CitationBadgeProps) {
  return (
    <button
      className="inline-flex items-center gap-1.5 bg-surface-container border border-outline-variant hover:border-primary/50 hover:bg-surface-container-high text-[10px] font-mono text-on-surface-variant hover:text-primary px-2 py-1 rounded-full transition-all"
      onClick={() => onPageJump(citation.page)}
      title={citation.snippet}
    >
      <span className="material-symbols-outlined text-[12px] text-primary">description</span>
      Page {citation.page}
    </button>
  );
}
