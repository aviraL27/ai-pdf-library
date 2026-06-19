import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  pdfId: string;
  pdfFilePath?: string;
  currentPage: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
}

export function PdfViewer({ pdfFilePath, currentPage, zoom, onPageChange, onZoomChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract just the filename from the stored path (e.g., "1234567_myfile.pdf")
  const filename = pdfFilePath ? pdfFilePath.split(/[\\/]/).pop() : null;
  const pdfUrl = filename ? `/uploads/${encodeURIComponent(filename)}` : null;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError('Failed to load PDF. The file may be corrupted or unavailable.');
    setIsLoading(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-11 bg-surface border-b border-outline-variant flex items-center justify-between px-4 shrink-0">
        {/* Left: Zoom */}
        <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-0.5">
          <button
            className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container-high transition-colors"
            onClick={() => onZoomChange(zoom - 0.1)}
            title="Zoom out"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          <span className="text-xs font-mono font-medium px-2 text-on-surface w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="p-1 text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container-high transition-colors"
            onClick={() => onZoomChange(zoom + 0.1)}
            title="Zoom in"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>

        {/* Center: Page nav */}
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <button
            className="p-1 hover:text-primary transition-colors disabled:opacity-30"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-on-surface">
            Page <span className="text-primary font-semibold">{currentPage}</span>
            {numPages > 0 && <span className="text-on-surface-variant"> of {numPages}</span>}
          </span>
          <button
            className="p-1 hover:text-primary transition-colors disabled:opacity-30"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1 text-on-surface-variant">
          <button
            className="p-1.5 rounded hover:bg-surface-container hover:text-primary transition-colors"
            onClick={() => onZoomChange(1.0)}
            title="Reset zoom"
          >
            <span className="material-symbols-outlined text-[18px]">fit_page</span>
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-surface-dim p-6 flex justify-center">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#a78bfa 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        {error ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
            <span className="material-symbols-outlined text-error text-[48px]">error_outline</span>
            <p className="text-sm text-on-surface-variant max-w-xs">{error}</p>
          </div>
        ) : (
          <div className="relative z-10">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                  <span className="text-xs text-on-surface-variant">Loading PDF...</span>
                </div>
              </div>
            )}
            <Document
              file={pdfUrl ?? ''}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="shadow-2xl"
            >
              <Page
                pageNumber={currentPage}
                scale={zoom}
                renderAnnotationLayer={false}
                renderTextLayer={true}
                className="border border-outline-variant"
                loading={
                  <div className="w-[600px] h-[800px] bg-surface-bright border border-outline-variant flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                  </div>
                }
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
