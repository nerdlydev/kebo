import { useState, useEffect, useRef } from 'react';
import { SearchScope } from '../../../store/useAppStore';
import Fuse from 'fuse.js';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: 'tab' | 'bookmark' | 'history' | 'closed';
  tabId?: number;
  sessionId?: string;
  windowId?: number;
}

export const useBrowserSearch = (activeScope: SearchScope, query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<SearchResult[]>([]);
  const fuseRef = useRef<Fuse<SearchResult> | null>(null);

  // 1. Fetch entire dataset when scope changes
  useEffect(() => {
    if (activeScope === 'none' || activeScope === 'web' || activeScope === 'settings') {
      setResults([]);
      cacheRef.current = [];
      fuseRef.current = null;
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchDataset = async () => {
      let fetched: SearchResult[] = [];

      try {
        if (activeScope === 'tabs') {
          const tabs = await chrome.tabs.query({});
          fetched = tabs
            .filter(t => t.url && t.url !== 'chrome://newtab/')
            .map(t => ({
              id: `tab-${t.id}`,
              title: t.title || t.url || 'Unknown Tab',
              url: t.url!,
              type: 'tab',
              tabId: t.id,
              windowId: t.windowId
            }));
        } else if (activeScope === 'bookmarks') {
          // Fetch the entire bookmark tree and flatten it
          const flatBookmarks: SearchResult[] = [];
          const processNodes = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
            for (const node of nodes) {
              if (node.url) {
                flatBookmarks.push({
                  id: `bm-${node.id}`,
                  title: node.title || node.url,
                  url: node.url,
                  type: 'bookmark'
                });
              }
              if (node.children) {
                processNodes(node.children);
              }
            }
          };
          const tree = await chrome.bookmarks.getTree();
          processNodes(tree);
          fetched = flatBookmarks;
        } else if (activeScope === 'history') {
          // Fetch up to 2000 recent history items to act as our local fuzzy corpus
          const hist = await chrome.history.search({
            text: '',
            maxResults: 2000,
            startTime: 0
          });
          fetched = hist
            .filter(h => h.url)
            .map(h => ({
              id: `hist-${h.id}`,
              title: h.title || h.url!,
              url: h.url!,
              type: 'history'
            }));
        } else if (activeScope === 'closed') {
          const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
          sessions.forEach(session => {
            if (session.tab && session.tab.url) {
              fetched.push({
                id: `closed-tab-${session.tab.sessionId}`,
                title: session.tab.title || session.tab.url,
                url: session.tab.url,
                type: 'closed',
                sessionId: session.tab.sessionId
              });
            } else if (session.window && session.window.tabs) {
              session.window.tabs.forEach(t => {
                if (t.url) {
                  fetched.push({
                    id: `closed-win-tab-${t.sessionId}`,
                    title: t.title || t.url,
                    url: t.url,
                    type: 'closed',
                    sessionId: session.window!.sessionId
                  });
                }
              });
            }
          });
        }

        if (isMounted) {
          cacheRef.current = fetched;
          // Initialize Fuse with robust weighting
          fuseRef.current = new Fuse(fetched, {
            keys: [
              { name: 'title', weight: 0.7 },
              { name: 'url', weight: 0.3 }
            ],
            threshold: 0.4,       // Forgiving fuzzy threshold
            includeScore: true,
            ignoreLocation: true, // Allow matching parts of words anywhere
          });
          
          // Initial population before user types
          setResults(fetched.slice(0, 50)); 
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error fetching dataset for ${activeScope}`, err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDataset();

    return () => {
      isMounted = false;
    };
  }, [activeScope]);

  // 2. Debounced Fuzzy Search Execution
  useEffect(() => {
    if (activeScope === 'none' || activeScope === 'web' || activeScope === 'settings') return;
    
    const normalizedQuery = query.trim();

    const executeSearch = () => {
      if (!fuseRef.current || !cacheRef.current) return;

      if (!normalizedQuery) {
        // If query is emptied, restore the default un-filtered list
        setResults(cacheRef.current.slice(0, 50));
        return;
      }

      // Execute fuzzy search against in-memory dataset
      const matched = fuseRef.current.search(normalizedQuery);
      
      // Fuse returns { item, score } objects. Map back to SearchResult and cap at 50 to ensure render performance
      setResults(matched.map(r => r.item).slice(0, 50));
    };

    // Apply 150ms debounce
    const timeoutId = setTimeout(executeSearch, 150);
    return () => clearTimeout(timeoutId);

  }, [query, activeScope]);

  return { results, isLoading };
};
