import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../../assets/tailwind.css';
import { ThemeProvider } from '../../components/ThemeProvider';

function SidePanelApp() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // Initial load
    chrome.storage.local.get(['sidebarUrl'], (result) => {
      if (result.sidebarUrl && typeof result.sidebarUrl === 'string') {
        setUrl(result.sidebarUrl);
      }
    });

    // Listen for updates
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes.sidebarUrl) {
        setUrl(changes.sidebarUrl.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return (
    <ThemeProvider>
      <div className="h-screen w-full bg-white dark:bg-neutral-950 flex flex-col kebo-base">
        {url ? (
          <iframe 
            src={url} 
            className="w-full h-full border-none flex-1" 
            title="Kebo Sidebar" 
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-neutral-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-center mb-4 border border-slate-200 dark:border-white/5 shadow-xl">
              <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <h3 className="font-medium text-slate-600 dark:text-neutral-300">Sidebar Ready</h3>
            <p className="text-sm mt-1">Open links in Split Mode from Kebo to view them here.</p>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
);
