import { useState } from 'react';
import { UploadModal } from '../ui/UploadModal';

export function TopNav() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <header className="bg-background border-b border-outline-variant w-full h-16 flex justify-between items-center px-6 shrink-0 z-20">
        {/* Brand + Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl icon-fill">hexagon</span>
            <span className="text-xl font-headline font-bold tracking-tighter text-on-surface">
              Obsidian PDF
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium tracking-tight">
            <a href="/" className="text-primary border-b-2 border-primary pb-0.5">Documents</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Library</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Settings</a>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            id="upload-pdf-btn"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150 shadow-[0_0_15px_rgba(167,139,250,0.15)]"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Upload PDF
          </button>
          <div className="flex items-center gap-2 text-on-surface-variant border-l border-outline-variant pl-4 ml-2">
            <button className="p-1.5 rounded-full hover:bg-surface-container hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
            <button className="p-1.5 rounded-full hover:bg-surface-container hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}
