import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TopNav } from './components/layout/TopNav';
import { SideNav } from './components/layout/SideNav';
import { LibraryPage } from './pages/LibraryPage';
import { ReaderPage } from './pages/ReaderPage';
import { useAppStore } from './store/useAppStore';

function App() {
  const loadPdfs = useAppStore((s) => s.loadPdfs);

  // Load all PDFs on app mount
  useEffect(() => {
    loadPdfs();
  }, [loadPdfs]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-on-surface">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-surface-container-lowest">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/pdf/:id" element={<ReaderPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
