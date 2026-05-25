import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OpenMode = 'current' | 'split' | 'new' | 'group';
export type SearchScope = 'none' | 'tabs' | 'bookmarks' | 'history' | 'closed' | 'web';

interface AppState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeScope: SearchScope;
  setActiveScope: (scope: SearchScope) => void;
  openMode: OpenMode;
  setOpenMode: (mode: OpenMode) => void;
  splitUrl: string | null;
  setSplitUrl: (url: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      activeScope: 'none',
      setActiveScope: (scope) => set({ activeScope: scope }),
      openMode: 'new',
      setOpenMode: (mode) => set({ openMode: mode }),
      splitUrl: null,
      setSplitUrl: (url) => set({ splitUrl: url }),
    }),
    {
      name: 'kebo-storage',
      // We only want to persist the openMode. 
      // We don't want to persist the search query or split URL across closing the panel.
      partialize: (state) => ({ openMode: state.openMode }),
    }
  )
);
