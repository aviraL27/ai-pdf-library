import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { UploadModal } from '../components/ui/UploadModal';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LibraryPage() {
  const [showUpload, setShowUpload] = useState(false);
  const { pdfs, setActivePdf, removePdf } = useAppStore();
  const navigate = useNavigate();

  const handleOpen = async (pdf: typeof pdfs[0]) => {
    await setActivePdf(pdf);
    navigate(`/pdf/${pdf.id}`);
  };

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
            My Library
          </h1>
          <p className="text-on-surface-variant text-sm">
            {pdfs.length > 0
              ? `${pdfs.length} document${pdfs.length !== 1 ? 's' : ''} — click any PDF to start chatting`
              : 'Upload a PDF to begin your AI-assisted reading session'}
          </p>
        </div>

        {pdfs.length === 0 ? (
          /* Empty state */
          <div
            className="border-2 border-dashed border-outline-variant hover:border-primary/50 rounded-xl p-16 text-center cursor-pointer transition-all group hover:bg-surface-container-low/30"
            onClick={() => setShowUpload(true)}
          >
            <div className="w-20 h-20 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center mx-auto mb-6 group-hover:border-primary/40 transition-all">
              <span className="material-symbols-outlined text-primary text-[36px] icon-fill">picture_as_pdf</span>
            </div>
            <h2 className="font-headline text-xl font-semibold text-on-surface mb-3 tracking-tight">
              Upload your first PDF
            </h2>
            <p className="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Drop any PDF here to start chatting with it. The AI will index every page and let you ask questions with precise page citations.
            </p>
            <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(167,139,250,0.2)]">
              Choose a PDF
            </button>
          </div>
        ) : (
          /* PDF Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Upload card */}
            <button
              onClick={() => setShowUpload(true)}
              className="border-2 border-dashed border-outline-variant hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-surface-container-low/30 group flex flex-col items-center justify-center gap-3 min-h-[160px]"
            >
              <span className="material-symbols-outlined text-outline group-hover:text-primary text-[32px] transition-colors icon-fill">add_circle</span>
              <span className="text-sm text-on-surface-variant group-hover:text-primary transition-colors font-medium">Upload PDF</span>
            </button>

            {/* PDF cards */}
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="bg-surface border border-outline-variant rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer group hover:bg-surface-container-low/20 relative"
                onClick={() => handleOpen(pdf)}
              >
                {/* Delete button */}
                <button
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
                  onClick={(e) => { e.stopPropagation(); removePdf(pdf.id); }}
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-12 bg-surface-container-high border border-outline-variant rounded flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px] icon-fill">picture_as_pdf</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-on-surface truncate tracking-tight leading-tight">{pdf.name}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{pdf.originalName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-mono">
                  {pdf.pageCount && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">menu_book</span>
                      {pdf.pageCount} pages
                    </span>
                  )}
                  {pdf.chunkCount && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">data_object</span>
                      {pdf.chunkCount} chunks
                    </span>
                  )}
                  {pdf.fileSize && (
                    <span>{formatBytes(pdf.fileSize)}</span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[10px] text-on-surface-variant/60">{formatDate(pdf.createdAt)}</span>
                  <span className="text-[10px] text-primary font-medium group-hover:underline">Open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
