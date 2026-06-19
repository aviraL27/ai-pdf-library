import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import type { PdfFile } from '../../types';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PdfItem({ pdf, isActive, onClick }: { pdf: PdfFile; isActive: boolean; onClick: () => void }) {
  const { removePdf } = useAppStore();

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-surface-container-highest text-primary border-r-4 border-primary font-bold'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
      onClick={onClick}
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? 'icon-fill' : ''}`}>
        description
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate leading-tight">{pdf.name}</p>
        <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
          {pdf.pageCount ? `${pdf.pageCount} pages` : ''}{pdf.pageCount && pdf.fileSize ? ' · ' : ''}
          {formatBytes(pdf.fileSize)}
        </p>
      </div>
      <button
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 hover:text-error transition-all"
        onClick={(e) => { e.stopPropagation(); removePdf(pdf.id); }}
        title="Delete PDF"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
      </button>
    </div>
  );
}

export function SideNav() {
  const { pdfs, activePdf, setActivePdf } = useAppStore();
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const handleSelect = (pdf: PdfFile) => {
    setActivePdf(pdf);
    navigate(`/pdf/${pdf.id}`);
  };

  return (
    <aside className="bg-surface border-r border-outline-variant w-64 h-full flex-shrink-0 flex flex-col hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
          <h2 className="font-headline text-sm font-bold text-on-surface tracking-tight">My Library</h2>
        </div>
        <p className="text-xs text-on-surface-variant">
          {pdfs.length} document{pdfs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* PDF List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {pdfs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center py-12">
            <span className="material-symbols-outlined text-outline text-[40px]">folder_open</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              No PDFs yet. Upload one to start chatting.
            </p>
          </div>
        ) : (
          pdfs.map((pdf) => (
            <PdfItem
              key={pdf.id}
              pdf={pdf}
              isActive={pdf.id === (activeId ?? activePdf?.id)}
              onClick={() => handleSelect(pdf)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-outline-variant">
        <nav className="flex flex-col gap-0.5 text-sm">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" href="#">
            <span className="material-symbols-outlined text-[18px]">contact_support</span>
            Support
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" href="#">
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Settings
          </a>
        </nav>
      </div>
    </aside>
  );
}
