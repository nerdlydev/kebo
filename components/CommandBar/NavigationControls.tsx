import React from 'react';
import { useActiveTabNavigation } from './hooks/useActiveTabNavigation';

export const NavigationControls = () => {
  const { splitUrl, canGoBack, canGoForward, isReloading, goBack, goForward, reload } = useActiveTabNavigation();

  if (!splitUrl) return null;

  return (
    <div className="flex items-center gap-0.5 mr-2">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 dark:text-neutral-400 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Go back"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 dark:text-neutral-400 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Go forward"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
      <button
        onClick={reload}
        className={`p-1.5 rounded-md transition-colors ${isReloading ? 'text-blue-500' : 'text-slate-500 hover:bg-slate-200 dark:text-neutral-400 dark:hover:bg-white/10'}`}
        aria-label="Reload page"
      >
        <svg className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};
