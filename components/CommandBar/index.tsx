import React, { useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import { useAppStore, SearchScope, OpenMode } from '../../store/useAppStore';
import { useBrowserSearch, SearchResult } from './hooks/useBrowserSearch';

export const CommandBar = () => {
  const { searchQuery, setSearchQuery, activeScope, setActiveScope, openMode, setOpenMode, splitUrl, setSplitUrl } = useAppStore();
  const { results, isLoading } = useBrowserSearch(activeScope, searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus immediately when scope changes
    inputRef.current?.focus();
    
    // Always keep focus when user clicks anywhere in the side panel
    const handleGlobalClick = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeScope]);

  const getUrl = (query: string) => {
    if (query.startsWith('http://') || query.startsWith('https://')) return query;
    if (query.includes('.') && !query.includes(' ')) return `https://${query}`;
    return `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
  };

  const handleOpenTarget = async (url: string, forceMode?: OpenMode) => {
    const modeToUse = forceMode || openMode;
    if (modeToUse === 'current') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.update(tab.id, { url });
      }
    } else if (modeToUse === 'new') {
      await chrome.tabs.create({ url, active: true });
    } else if (modeToUse === 'group') {
      const tab = await chrome.tabs.create({ url, active: true });
      if (tab?.id) {
        const group = await chrome.tabs.group({ tabIds: tab.id });
        await chrome.tabGroups.update(group, { title: 'Kebo', color: 'blue' });
      }
    } else if (modeToUse === 'split') {
      setSplitUrl(url);
    }
  };

  const handleResultSelect = async (item: SearchResult) => {
    if (item.type === 'tab' && item.tabId) {
      await chrome.tabs.update(item.tabId, { active: true });
      if (item.windowId) {
        await chrome.windows.update(item.windowId, { focused: true });
      }
    } else if (item.type === 'closed' && item.sessionId) {
      await chrome.sessions.restore(item.sessionId);
    } else {
      await handleOpenTarget(item.url);
    }
    setSearchQuery('');
    setActiveScope('none');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to clear scope
    if (e.key === 'Backspace' && searchQuery === '' && activeScope !== 'none') {
      e.preventDefault();
      setActiveScope('none');
    }

    // Handle raw enter execution if not selecting an item
    if (e.key === 'Enter' && searchQuery.trim() && activeScope === 'none' && !searchQuery.startsWith('/')) {
      // Small timeout to allow cmdk onSelect to fire first if an item was highlighted
      setTimeout(() => {
        const activeElement = document.activeElement;
        // Check if an item in the list is currently selected by cmdk
        const isItemFocused = document.querySelector('[cmdk-item][data-selected="true"]');
        if (!isItemFocused) {
           handleOpenTarget(getUrl(searchQuery.trim()));
           if (openMode !== 'split') {
             setSearchQuery('');
           }
        }
      }, 50);
    }
  };

  const modes: { id: OpenMode; label: string }[] = [
    { id: 'current', label: 'Current Tab' },
    { id: 'new', label: 'New Tab' },
    { id: 'group', label: 'Tab Group' },
    { id: 'split', label: 'Split Mode' }
  ];

  const availableScopes: { id: SearchScope; label: string; prefix: string; icon: string }[] = [
    { id: 'tabs', label: 'Open Tabs', prefix: '/tabs', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'bookmarks', label: 'Bookmarks', prefix: '/bookmarks', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { id: 'history', label: 'History', prefix: '/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'closed', label: 'Recently Closed', prefix: '/closed', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' }
  ];

  // Derive if we are in command selection mode
  const isSelectingScope = activeScope === 'none' && searchQuery.startsWith('/');

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-200">
      
      {/* Settings / Mode Selector (moved to top for cleaner layout) */}
      <div className="flex items-center gap-2 p-2 border-b border-white/5 bg-neutral-900/30">
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider ml-2 mr-1">Open links in:</span>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              setOpenMode(mode.id);
              if (mode.id !== 'split') setSplitUrl(null);
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
              openMode === mode.id 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <Command 
        className="flex flex-col flex-1 overflow-hidden" 
        shouldFilter={false} // We handle filtering manually via useBrowserSearch
        label="Global Command Menu"
      >
        {/* Omnibar Header */}
        <div className="flex items-center p-3 border-b border-white/10 bg-neutral-900/50 backdrop-blur-md transition-all">
          
          {/* Active Scope Badge */}
          {activeScope !== 'none' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 mr-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium">
              <span>{availableScopes.find(s => s.id === activeScope)?.label}</span>
            </div>
          )}

          <Command.Input 
            ref={inputRef}
            autoFocus
            value={searchQuery}
            onValueChange={(val) => {
              // Auto-trigger scope if they type the exact prefix + space
              if (activeScope === 'none') {
                const matchedScope = availableScopes.find(s => val.toLowerCase() === `${s.prefix} `);
                if (matchedScope) {
                  setActiveScope(matchedScope.id);
                  setSearchQuery('');
                  return;
                }
              }
              setSearchQuery(val);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white text-lg outline-none placeholder:text-neutral-500 flex-1" 
            placeholder={activeScope === 'none' ? "Type a URL, search, or type / for commands..." : `Search ${activeScope}...`}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* Split Mode Iframe */}
          {splitUrl && activeScope === 'none' && !searchQuery.startsWith('/') && (
            <div className="absolute inset-0 flex flex-col z-10 bg-white">
              <div className="absolute top-0 w-full h-1 bg-blue-500/20 animate-pulse"></div>
              <iframe src={splitUrl} className="w-full h-full border-none" title="Split View" />
            </div>
          )}

          <Command.List className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            
            {/* Scope Selection List */}
            {isSelectingScope && (
              <Command.Group heading="Commands" className="text-xs font-medium text-neutral-500 px-2 py-2 [&_[cmdk-group-items]]:mt-2">
                {availableScopes
                  .filter(s => s.prefix.includes(searchQuery.toLowerCase()))
                  .map((scope) => (
                  <Command.Item 
                    key={scope.id}
                    value={scope.prefix}
                    onSelect={() => {
                      setActiveScope(scope.id);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-sm text-neutral-300 hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={scope.icon} />
                    </svg>
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-200">{scope.label}</span>
                      <span className="text-xs text-neutral-500">Search through your {scope.label.toLowerCase()}</span>
                    </div>
                    <span className="ml-auto text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400 font-mono">
                      {scope.prefix}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Loading State */}
            {isLoading && activeScope !== 'none' && (
              <div className="p-4 text-center text-sm text-neutral-500">Searching...</div>
            )}

            {/* Empty State for Scoped Search */}
            {!isLoading && activeScope !== 'none' && results.length === 0 && (
              <Command.Empty className="p-8 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
                <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                No results found in {activeScope}.
              </Command.Empty>
            )}

            {/* Search Results */}
            {!isSelectingScope && activeScope !== 'none' && results.length > 0 && (
              <Command.Group className="[&_[cmdk-group-items]]:mt-1">
                {results.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id} // value is used by cmdk for state tracking
                    onSelect={() => handleResultSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-neutral-300 hover:bg-blue-500/10 aria-selected:bg-blue-500/20 aria-selected:text-blue-100 transition-colors border border-transparent aria-selected:border-blue-500/30 group"
                  >
                    {item.type === 'tab' && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">TAB</span>}
                    {item.type === 'bookmark' && <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">BM</span>}
                    {item.type === 'history' && <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">HIST</span>}
                    {item.type === 'closed' && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">CLSD</span>}
                    
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-neutral-200 truncate">{item.title}</span>
                      <span className="text-[10px] text-neutral-500 truncate group-aria-selected:text-blue-300/70">{item.url}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Default Empty State */}
            {activeScope === 'none' && !isSelectingScope && !splitUrl && (
               <div className="h-full flex flex-col items-center justify-center p-10 text-center text-neutral-500 space-y-4 mt-10">
                 <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-xl">
                   <span className="text-2xl font-bold text-neutral-600">/</span>
                 </div>
                 <div className="space-y-1">
                   <h3 className="font-medium text-neutral-300">Command Mode Ready</h3>
                   <p className="text-sm">Type <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">/</kbd> to browse commands.</p>
                 </div>
               </div>
            )}

          </Command.List>
        </div>
      </Command>
    </div>
  );
};
