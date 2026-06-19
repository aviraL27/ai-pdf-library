import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { ChatPanel } from '../components/chat/ChatPanel';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    pdfs,
    activePdf,
    setActivePdf,
    currentPage,
    zoom,
    setPage,
    setZoom,
    isChatOpen,
    layoutMode,
    setLayoutMode,
  } = useAppStore();

  // Load the active PDF from the URL param
  useEffect(() => {
    if (!id) return;
    if (activePdf?.id === id) return; // already loaded

    const pdf = pdfs.find((p) => p.id === id);
    if (pdf) {
      setActivePdf(pdf);
    } else {
      // PDF not in store yet — try fetching list first
      navigate('/');
    }
  }, [id, pdfs, activePdf, setActivePdf, navigate]);

  if (!activePdf) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-on-surface-variant">Loading document...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Workspace Toolbar */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-outline-variant bg-surface-container-low shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">folder</span>
          <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">
            Library
          </button>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-on-surface font-medium truncate max-w-[200px]">{activePdf.originalName}</span>
        </div>

        {/* Layout Toggle — matches pg4 toolbar */}
        <div className="flex items-center bg-surface border border-outline-variant rounded-lg p-0.5 gap-0.5">
          <button
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === 'split'
                ? 'bg-surface-container-highest text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Split view"
            onClick={() => setLayoutMode('split')}
          >
            <span className="material-symbols-outlined text-[18px]">splitscreen</span>
          </button>
          <button
            className={`p-1.5 rounded-md transition-colors ${
              layoutMode === 'immersive'
                ? 'bg-surface-container-highest text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Immersive PDF view"
            onClick={() => setLayoutMode('immersive')}
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          </button>
        </div>
      </div>

      {/* Main Dual Pane */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* PDF Viewer — always shown */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
          layoutMode === 'split' && isChatOpen
            ? 'flex-1 border-r border-outline-variant'
            : 'flex-1'
        }`}>
          <PdfViewer
            pdfId={activePdf.id}
            pdfFilePath={activePdf.filePath}
            currentPage={currentPage}
            zoom={zoom}
            onPageChange={setPage}
            onZoomChange={setZoom}
          />
        </div>

        {/* Chat Panel */}
        {layoutMode === 'split' ? (
          /* Split mode: fixed right panel */
          isChatOpen ? (
            <ChatPanel onPageJump={setPage} />
          ) : (
            <button
              className="absolute right-4 bottom-4 w-12 h-12 bg-primary text-on-primary rounded-full shadow-[0_0_20px_rgba(167,139,250,0.25)] flex items-center justify-center hover:bg-surface-tint hover:scale-105 active:scale-95 transition-all duration-300 z-30 border border-primary-fixed"
              onClick={() => useAppStore.getState().toggleChat()}
              title="Open AI Chat"
            >
              <span className="material-symbols-outlined icon-fill">chat</span>
            </button>
          )
        ) : (
          /* Immersive mode: glassmorphism overlay */
          <>
            {isChatOpen ? (
              <aside className="absolute right-4 top-4 bottom-4 w-[380px] glass-panel border border-outline-variant/50 rounded-xl flex flex-col shadow-2xl z-40 animate-slide-in">
                <ChatPanel onPageJump={setPage} />
              </aside>
            ) : (
              <button
                className="absolute right-6 bottom-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-[0_0_20px_rgba(167,139,250,0.25)] flex items-center justify-center hover:bg-surface-tint hover:scale-105 active:scale-95 transition-all duration-300 z-30 border border-primary-fixed"
                onClick={() => useAppStore.getState().toggleChat()}
                title="Open AI Chat"
              >
                <span className="material-symbols-outlined icon-fill">chat</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
