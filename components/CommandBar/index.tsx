import React, { useRef, useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useAppStore, SearchScope, OpenMode, SearchEnginePref, ThemePref } from '../../store/useAppStore';
import { useBrowserSearch, SearchResult } from './hooks/useBrowserSearch';
import { NavigationControls } from './NavigationControls';

interface CommandBarProps {
  isOverlay?: boolean;
  onClose?: () => void;
  initialScope?: string;
}

export const CommandBar = ({ isOverlay, onClose, initialScope }: CommandBarProps) => {
  const { 
    searchQuery, setSearchQuery, 
    activeScope, setActiveScope, 
    openMode, setOpenMode, 
    splitUrl, setSplitUrl,
    theme, setTheme,
    searchEngine, setSearchEngine 
  } = useAppStore();
  
  const [iframeBgColor, setIframeBgColor] = useState<string | null>(null);

  const { results, isLoading } = useBrowserSearch(activeScope, searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleGlobalClick = () => inputRef.current?.focus();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeScope]);

  useEffect(() => {
    if (initialScope) {
      setActiveScope(initialScope as SearchScope);
    }
  }, [initialScope, setActiveScope]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && searchQuery === '' && activeScope !== 'none') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        // Allow backspace inside real text inputs if we ever add them
        if (activeTag === 'input' && (document.activeElement as HTMLInputElement).type === 'text' && activeScope !== 'settings') {
          return; 
        }
        
        e.preventDefault();
        e.stopPropagation();
        setActiveScope('none');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [searchQuery, activeScope, setActiveScope]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'KEBO_IFRAME_BG_COLOR' && event.data.color) {
        setIframeBgColor(event.data.color);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getUrl = (query: string) => {
    if (query.startsWith('http://') || query.startsWith('https://')) return query;
    if (query.includes('.') && !query.includes(' ')) return `https://${query}`;
    
    switch (searchEngine) {
      case 'duckduckgo': return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      case 'startpage': return `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
      case 'qwant': return `https://www.qwant.com/?q=${encodeURIComponent(query)}`;
      case 'ecosia': return `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`;
      case 'brave':
      default:
        return `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
    }
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
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      if (isOverlay && onClose) {
        onClose();
      }
    }

    if (e.key === 'Backspace' && searchQuery === '' && activeScope !== 'none') {
      e.preventDefault();
      setActiveScope('none');
    }

    if (e.key === 'Enter') {
      e.preventDefault(); // Stop cmdk from double-firing if it was trying to

      // 1. Try to activate the currently highlighted command item
      // Since this runs in a Shadow DOM, we must query from the shadow root, not the global document
      const shadowRoot = inputRef.current?.getRootNode() as Document | ShadowRoot;
      const selectedItem = shadowRoot?.querySelector('[cmdk-item][data-selected="true"]') as HTMLElement;
      
      if (selectedItem) {
        selectedItem.click(); // cmdk items respond to native clicks
        return;
      }

      // 2. Fallback: if no item is highlighted (e.g. typing a raw URL in 'none' scope)
      if (searchQuery.trim() && activeScope === 'none' && !searchQuery.startsWith('/')) {
        handleOpenTarget(getUrl(searchQuery.trim()));
        if (openMode !== 'split') {
          setSearchQuery('');
        }
      }
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
    { id: 'closed', label: 'Recently Closed', prefix: '/closed', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
    { id: 'settings', label: 'Settings', prefix: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  const isSelectingScope = activeScope === 'none' && searchQuery.startsWith('/');

  return (
    <div className={`flex flex-col ${isOverlay ? 'max-h-[600px] bg-transparent' : 'h-screen bg-slate-50/80 dark:bg-neutral-950/80 backdrop-blur-2xl'} text-slate-900 dark:text-neutral-200 transition-colors duration-200`}>
      

      <Command 
        className="flex flex-col flex-1 overflow-hidden" 
        shouldFilter={false}
        label="Global Command Menu"
      >
        <div className={`flex items-center p-4 gap-3 ${isOverlay ? 'bg-transparent' : 'bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md'}`}>
          <NavigationControls />
          

          {activeScope !== 'none' && (
            <div 
              onClick={() => {
                setActiveScope('none');
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 mr-1 shrink-0 bg-blue-100 border border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/30 rounded-lg text-blue-700 dark:text-blue-400 text-sm font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
              title="Click to clear"
            >
              <span>{availableScopes.find(s => s.id === activeScope)?.label || activeScope}</span>
              <svg className="w-3.5 h-3.5 ml-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
          )}

          <Command.Input 
            ref={inputRef}
            autoFocus
            value={searchQuery}
            onValueChange={(val) => {
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
            className="w-full bg-transparent text-slate-900 dark:text-white text-xl outline-none placeholder:text-slate-400/80 dark:placeholder:text-neutral-500/80 flex-1" 
            placeholder={activeScope === 'none' ? "Type a URL, search, or type / for commands..." : `Search ${activeScope}...`}
          />
        </div>

        <div 
          className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            activeScope === 'none' && !isSelectingScope && !splitUrl && isOverlay 
              ? 'grid-rows-[0fr] opacity-0' 
              : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden relative flex flex-col min-h-0">
          <div className="h-[2px] w-full bg-white/20 dark:bg-white/10 shrink-0" />
          
          {splitUrl && activeScope === 'none' && !searchQuery.startsWith('/') && (
            <div 
              className={`absolute inset-0 flex flex-col z-10 ${iframeBgColor ? '' : 'bg-white dark:bg-neutral-950'}`}
              style={iframeBgColor ? { backgroundColor: iframeBgColor } : undefined}
            >
              <div className="absolute top-0 w-full h-1 bg-blue-500/20 animate-pulse"></div>
              <iframe name="kebo-split-view" src={splitUrl} className="w-full h-full border-none" title="Split View" />
            </div>
          )}

          <Command.List className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            
            {/* Settings View */}
            {activeScope === 'settings' && (
              <div className="flex flex-col gap-2 p-2 animate-in fade-in duration-200">
                <Command.Group heading="Default Open Behavior" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-items]]:mt-1">
                  {modes.map(mode => (
                    <Command.Item
                      key={mode.id}
                      value={`open mode ${mode.label}`}
                      onSelect={() => {
                        setOpenMode(mode.id);
                        if (mode.id !== 'split') setSplitUrl(null);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-full cursor-pointer text-sm transition-colors ${openMode === mode.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10'} aria-selected:bg-blue-50 dark:aria-selected:bg-blue-500/20 aria-selected:text-blue-700 dark:aria-selected:text-blue-100`}
                    >
                      <div className="flex-1 font-medium">{mode.label}</div>
                      {openMode === mode.id && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Search Engine" className="mt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-items]]:mt-1">
                  {[
                    { id: 'brave', label: 'Brave Search (Default)' },
                    { id: 'duckduckgo', label: 'DuckDuckGo' },
                    { id: 'startpage', label: 'Startpage' },
                    { id: 'qwant', label: 'Qwant' },
                    { id: 'ecosia', label: 'Ecosia' }
                  ].map(engine => (
                    <Command.Item
                      key={engine.id}
                      value={`search engine ${engine.label}`}
                      onSelect={() => setSearchEngine(engine.id as SearchEnginePref)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-full cursor-pointer text-sm transition-colors ${searchEngine === engine.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10'} aria-selected:bg-blue-50 dark:aria-selected:bg-blue-500/20 aria-selected:text-blue-700 dark:aria-selected:text-blue-100`}
                    >
                      <div className="flex-1 font-medium">{engine.label}</div>
                      {searchEngine === engine.id && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Appearance" className="mt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-items]]:mt-1">
                  {[
                    { id: 'system', label: 'System' },
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' }
                  ].map(t => (
                    <Command.Item
                      key={t.id}
                      value={`appearance theme ${t.label}`}
                      onSelect={() => setTheme(t.id as ThemePref)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-full cursor-pointer text-sm transition-colors ${theme === t.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10'} aria-selected:bg-blue-50 dark:aria-selected:bg-blue-500/20 aria-selected:text-blue-700 dark:aria-selected:text-blue-100`}
                    >
                      <div className="flex-1 font-medium">{t.label}</div>
                      {theme === t.id && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <div className="space-y-3 mt-6">
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-500">Keyboard Shortcuts</h3>
                  <div className="p-4 mx-2 bg-slate-100/50 dark:bg-neutral-900/30 rounded-[24px] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mb-1">Kebo shortcuts can be configured natively in Chrome.</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Open Kebo</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded-full shadow-sm text-xs text-slate-600 dark:text-neutral-400 font-mono">Cmd/Ctrl + Shift + K</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Search Tabs</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded-full shadow-sm text-xs text-slate-600 dark:text-neutral-400 font-mono">Cmd/Ctrl + Shift + T</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Search History</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded-full shadow-sm text-xs text-slate-600 dark:text-neutral-400 font-mono opacity-60">Unbound</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">Search Bookmarks</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-white/10 rounded-full shadow-sm text-xs text-slate-600 dark:text-neutral-400 font-mono opacity-60">Unbound</kbd>
                    </div>
                    <div className="mt-2 pt-3 border-t border-slate-200 dark:border-white/5">
                      <a href="chrome://extensions/shortcuts" target="_blank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Customize Shortcuts &rarr;</a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSelectingScope && (
              <Command.Group heading="Commands" className="text-xs font-medium text-slate-500 dark:text-neutral-500 px-2 py-2 [&_[cmdk-group-items]]:mt-2">
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
                    className="flex items-center gap-3 px-3 py-3 rounded-full cursor-pointer text-sm text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10 aria-selected:bg-slate-100 dark:aria-selected:bg-white/10 aria-selected:text-slate-900 dark:aria-selected:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={scope.icon} />
                    </svg>
                    <div className="flex flex-col">
                      <span className="font-medium">{scope.label}</span>
                      <span className="text-xs text-slate-400 dark:text-neutral-500">Search through your {scope.label.toLowerCase()}</span>
                    </div>
                    <span className="ml-auto text-xs bg-slate-200 dark:bg-neutral-800 px-2 py-1 rounded text-slate-500 dark:text-neutral-400 font-mono">
                      {scope.prefix}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {isLoading && activeScope !== 'none' && activeScope !== 'settings' && (
              <div className="p-4 text-center text-sm text-slate-400 dark:text-neutral-500">Searching...</div>
            )}

            {!isLoading && activeScope !== 'none' && activeScope !== 'settings' && results.length === 0 && (
              <Command.Empty className="p-8 text-center text-sm text-slate-400 dark:text-neutral-500 flex flex-col items-center gap-2">
                <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                No results found in {activeScope}.
              </Command.Empty>
            )}

            {!isSelectingScope && activeScope !== 'none' && activeScope !== 'settings' && results.length > 0 && (
              <Command.Group className="[&_[cmdk-group-items]]:mt-1">
                {results.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleResultSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-full cursor-pointer text-sm text-slate-700 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 aria-selected:bg-blue-50 dark:aria-selected:bg-blue-500/20 aria-selected:text-blue-700 dark:aria-selected:text-blue-100 transition-colors border border-transparent aria-selected:border-blue-200 dark:aria-selected:border-blue-500/30 group"
                  >
                    {item.type === 'tab' && <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded">TAB</span>}
                    {item.type === 'bookmark' && <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded">BM</span>}
                    {item.type === 'history' && <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">HIST</span>}
                    {item.type === 'closed' && <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded">CLSD</span>}
                    
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 truncate group-aria-selected:text-blue-600/70 dark:group-aria-selected:text-blue-300/70">{item.url}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {activeScope === 'none' && !isSelectingScope && !splitUrl && !isOverlay && (
               <div className="h-full flex flex-col items-center justify-center p-10 text-center text-slate-400 dark:text-neutral-500 space-y-4 mt-10">
                 <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-neutral-900 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-xl">
                   <span className="text-2xl font-bold text-slate-400 dark:text-neutral-600">/</span>
                 </div>
                 <div className="space-y-1">
                   <h3 className="font-medium text-slate-600 dark:text-neutral-300">Command Mode Ready</h3>
                   <p className="text-sm">Type <kbd className="bg-slate-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-neutral-300">/</kbd> to browse commands.</p>
                 </div>
               </div>
            )}

          </Command.List>
          </div>
        </div>
      </Command>
    </div>
  );
};
