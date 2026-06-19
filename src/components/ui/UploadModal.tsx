import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

interface UploadModalProps {
  onClose: () => void;
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { uploadFile, isUploading, uploadProgress, uploadError } = useAppStore();

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported.');
      return;
    }
    const pdf = await uploadFile(file);
    if (pdf) {
      onClose();
      navigate(`/pdf/${pdf.id}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !isUploading) onClose(); }}
    >
      <div className="bg-surface border border-outline-variant rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
            <h2 className="font-headline font-semibold text-on-surface tracking-tight">Upload PDF</h2>
          </div>
          {!isUploading && (
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {isUploading ? (
            /* Progress State */
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-outline-variant" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-on-surface">{uploadProgress || 'Processing...'}</p>
                <p className="text-xs text-on-surface-variant mt-1">This may take a few minutes for large PDFs</p>
              </div>
            </div>
          ) : (
            /* Drop Zone */
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <span className="material-symbols-outlined text-primary text-[40px] mb-3 block icon-fill">picture_as_pdf</span>
              <p className="text-sm font-medium text-on-surface mb-1">
                {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF'}
              </p>
              <p className="text-xs text-on-surface-variant">or click to browse — max 100 MB</p>
            </div>
          )}

          {/* Error */}
          {uploadError && (
            <div className="mt-4 flex items-center gap-2 bg-error-container border border-error/30 text-on-error-container px-4 py-3 rounded-lg text-sm">
              <span className="material-symbols-outlined text-[18px] text-error">error</span>
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
