import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export type OpenMode = 'current' | 'split' | 'new' | 'group';
export type SearchScope = 'none' | 'tabs' | 'bookmarks' | 'history' | 'closed' | 'web' | 'settings';
export type ThemePref = 'system' | 'light' | 'dark';
export type SearchEnginePref = 'brave' | 'duckduckgo' | 'startpage' | 'qwant' | 'ecosia';

interface AppState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeScope: SearchScope;
  setActiveScope: (scope: SearchScope) => void;
  openMode: OpenMode;
  setOpenMode: (mode: OpenMode) => void;
  splitUrl: string | null;
  setSplitUrl: (url: string | null) => void;
  theme: ThemePref;
  setTheme: (theme: ThemePref) => void;
  searchEngine: SearchEnginePref;
  setSearchEngine: (engine: SearchEnginePref) => void;
}

const chromeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(name);
    return (result[name] as string) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [name]: value });
  },
  removeItem: async (name: string): Promise<void> => {
    await chrome.storage.local.remove(name);
  },
};

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
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      searchEngine: 'brave',
      setSearchEngine: (searchEngine) => set({ searchEngine }),
    }),
    {
      name: 'kebo-storage',
      // We only want to persist the openMode and settings. 
      // We don't want to persist the search query or split URL across closing the panel.
      partialize: (state) => ({ 
        openMode: state.openMode,
        theme: state.theme,
        searchEngine: state.searchEngine
      }),
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
