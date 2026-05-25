import { useState, useEffect } from 'react';
import { SearchScope } from '../../../store/useAppStore';

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

  useEffect(() => {
    if (activeScope === 'none' || activeScope === 'web') {
      setResults([]);
      return;
    }

    let isMounted = true;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const normalizedQuery = query.trim().toLowerCase();
        let fetched: SearchResult[] = [];

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

          // Manual client-side filter if query exists
          if (normalizedQuery) {
            fetched = fetched.filter(t => 
              t.title.toLowerCase().includes(normalizedQuery) || 
              t.url.toLowerCase().includes(normalizedQuery)
            );
          }
        } 
        else if (activeScope === 'bookmarks') {
          if (normalizedQuery) {
            const bms = await chrome.bookmarks.search(normalizedQuery);
            fetched = bms
              .filter(b => b.url) // Only show actual links, not folders
              .map(b => ({
                id: `bm-${b.id}`,
                title: b.title || b.url!,
                url: b.url!,
                type: 'bookmark'
              }));
          } else {
            const bms = await chrome.bookmarks.getRecent(50);
            fetched = bms.map(b => ({
              id: `bm-${b.id}`,
              title: b.title || b.url!,
              url: b.url!,
              type: 'bookmark'
            }));
          }
        }
        else if (activeScope === 'history') {
          const hist = await chrome.history.search({ 
            text: normalizedQuery,
            maxResults: 50,
            startTime: 0 // Search all history
          });
          fetched = hist
            .filter(h => h.url)
            .map(h => ({
              id: `hist-${h.id}`,
              title: h.title || h.url!,
              url: h.url!,
              type: 'history'
            }));
        }
        else if (activeScope === 'closed') {
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
              // Extract tabs from closed window
              session.window.tabs.forEach(t => {
                if (t.url) {
                  fetched.push({
                    id: `closed-win-tab-${t.sessionId}`,
                    title: t.title || t.url,
                    url: t.url,
                    type: 'closed',
                    sessionId: session.window!.sessionId // use window session to restore whole window, or tab session
                  });
                }
              });
            }
          });

          if (normalizedQuery) {
            fetched = fetched.filter(t => 
              t.title.toLowerCase().includes(normalizedQuery) || 
              t.url.toLowerCase().includes(normalizedQuery)
            );
          }
        }

        if (isMounted) {
          setResults(fetched);
        }
      } catch (err) {
        console.error(`Error searching ${activeScope}:`, err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Debounce history searches slightly since they can be heavy
    const timeoutId = setTimeout(fetchResults, activeScope === 'history' ? 150 : 0);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [activeScope, query]);

  return { results, isLoading };
};
