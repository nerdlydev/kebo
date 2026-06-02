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
  const [shortcuts, setShortcuts] = useState<Array<{ name: string, description: string, shortcut: string }>>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'GET_SHORTCUTS' }, (commands) => {
        if (!commands) return;
        
        const formatShortcut = (shortcut: string) => {
          return shortcut
            .replace(/Command/g, '⌘')
            .replace(/Shift/g, '⇧')
            .replace(/Ctrl/g, '⌃')
            .replace(/Alt/g, '⌥')
            .replace(/MacCtrl/g, '⌃')
            .replace(/\+/g, '');
        };

        const formattedCommands = commands.map((cmd: any) => {
          // Format description for default action and others
          let desc = cmd.description;
          if (cmd.name === '_execute_action') desc = 'Activate the extension';
          if (!desc) desc = cmd.name;
          
          return {
            name: cmd.name,
            description: desc,
            shortcut: cmd.shortcut ? formatShortcut(cmd.shortcut) : 'Not set'
          };
        });
        
        setShortcuts(formattedCommands);
      });
    }
  }, []);

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
      window.location.href = url;
    } else if (modeToUse === 'new') {
      window.open(url, '_blank');
    } else if (modeToUse === 'group') {
      chrome.runtime.sendMessage({ type: 'OPEN_IN_GROUP', url });
    } else if (modeToUse === 'split') {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR', url });
    }
    if (isOverlay && onClose) {
      onClose();
    }
  };

  const handleResultSelect = async (item: SearchResult) => {
    if (item.type === 'tab' && item.tabId) {
      chrome.runtime.sendMessage({ type: 'FOCUS_TAB', tabId: item.tabId, windowId: item.windowId });
      if (isOverlay && onClose) onClose();
    } else if (item.type === 'closed' && item.sessionId) {
      chrome.runtime.sendMessage({ type: 'RESTORE_SESSION', sessionId: item.sessionId });
      if (isOverlay && onClose) onClose();
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
      // Fallback: if no item is highlighted (e.g. typing a raw search query in 'none' scope)
      if (searchQuery.trim() && activeScope === 'none' && !searchQuery.startsWith('/')) {
        handleOpenTarget(getUrl(searchQuery.trim()));
        if (openMode !== 'split') {
          setSearchQuery('');
        }
      }
    }
  };

  const modes: { id: OpenMode; label: string; icon: string }[] = [
    { id: 'current', label: 'Current Tab', icon: 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5z' },
    { id: 'new', label: 'New Tab', icon: 'M12 4v16m8-8H4' },
    { id: 'group', label: 'Tab Group', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'split', label: 'Split Mode', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m10-14h-2a2 2 0 00-2 2v10a2 2 0 002 2h2' }
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
              className="flex items-center gap-1.5 px-3 py-1 mr-2 shrink-0 bg-slate-100/80 dark:bg-neutral-800/80 border border-slate-200/60 dark:border-white/10 rounded-full text-slate-600 dark:text-neutral-300 text-[13px] font-normal cursor-pointer hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all"
              title="Click to clear"
            >
              <span>{availableScopes.find(s => s.id === activeScope)?.label || activeScope}</span>
              <svg className="w-3.5 h-3.5 ml-0.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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
            className="w-full bg-transparent text-slate-900 dark:text-white text-xl font-normal outline-none placeholder:text-slate-400/60 dark:placeholder:text-neutral-500/60 flex-1" 
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
          
          <Command.List className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            
            {/* Settings View (Sliding Segments) */}
            {activeScope === 'settings' && (
              <div className="flex flex-col gap-6 p-4 animate-in fade-in zoom-in-[0.98] duration-200">
                
                {/* Row 1: Behavior & Appearance */}
                <div className="flex gap-6 items-stretch pb-2">
                  <Command.Group heading="Open Behavior" className="flex-1 flex flex-col [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-neutral-400 [&_[cmdk-group-items]]:flex-1 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col">
                    <div className="bg-slate-100/50 dark:bg-neutral-900/40 p-1.5 rounded-[14px] border border-slate-200/60 dark:border-white/10 flex-1 flex flex-col justify-center">
                      <div className="relative flex gap-2 flex-1 items-stretch">
                        <div className="absolute top-0 bottom-0 left-0 bg-white dark:bg-white/10 rounded-full shadow-sm border border-slate-200/80 dark:border-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `calc((100% - ${(modes.length - 1) * 8}px) / ${modes.length})`, transform: `translateX(calc(${modes.findIndex(m => m.id === openMode) * 100}% + ${modes.findIndex(m => m.id === openMode) * 8}px))` }} />
                        {modes.map(mode => (
                          <Command.Item
                            key={mode.id}
                            data-kebo-item="true"
                            value={`open mode ${mode.label}`}
                            onSelect={() => {
                              setOpenMode(mode.id);
                              if (mode.id !== 'split') setSplitUrl(null);
                            }}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 h-full text-[12px] rounded-full cursor-pointer transition-colors outline-none hover:bg-slate-200/50 dark:hover:bg-white/5 aria-selected:bg-slate-200/50 dark:aria-selected:bg-white/5 ${openMode === mode.id ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-neutral-400'}`}
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mode.icon} /></svg>
                            <span className="hidden sm:inline whitespace-nowrap">{mode.label}</span>
                          </Command.Item>
                        ))}
                      </div>
                    </div>
                  </Command.Group>

                  <Command.Group heading="Appearance" className="shrink-0 flex flex-col [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-neutral-400 [&_[cmdk-group-items]]:flex-1 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col">
                    <div className="bg-slate-100/50 dark:bg-neutral-900/40 p-1.5 rounded-[14px] border border-slate-200/60 dark:border-white/10 flex-1 flex flex-col justify-center">
                      <div className="relative flex gap-2 items-center">
                        <div className="absolute top-0 bottom-0 left-0 bg-white dark:bg-white/10 rounded-full shadow-sm border border-slate-200/80 dark:border-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-8" style={{ transform: `translateX(${['system', 'light', 'dark'].indexOf(theme) * 40}px)` }} />
                        {[
                          { id: 'system', label: 'System', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                          { id: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                          { id: 'dark', label: 'Dark', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' }
                        ].map(t => (
                          <Command.Item
                            key={t.id}
                            data-kebo-item="true"
                            value={`appearance theme ${t.label}`}
                            onSelect={() => setTheme(t.id as ThemePref)}
                            title={t.label}
                            className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors outline-none hover:bg-slate-200/50 dark:hover:bg-white/5 aria-selected:bg-slate-200/50 dark:aria-selected:bg-white/5 ${theme === t.id ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-neutral-400'}`}
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon} /></svg>
                          </Command.Item>
                        ))}
                      </div>
                    </div>
                  </Command.Group>
                </div>

                {/* Row 2: Search Engine */}
                <Command.Group heading="Search Engine" className="[&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500 dark:[&_[cmdk-group-heading]]:text-neutral-400">
                  <div className="bg-slate-100/50 dark:bg-neutral-900/40 p-1.5 rounded-[14px] border border-slate-200/60 dark:border-white/10">
                    <div className="relative flex gap-2">
                      <div className="absolute top-0 bottom-0 left-0 bg-white dark:bg-white/10 rounded-full shadow-sm border border-slate-200/80 dark:border-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `calc((100% - 32px) / 5)`, transform: `translateX(calc(${['brave', 'duckduckgo', 'startpage', 'qwant', 'ecosia'].indexOf(searchEngine) * 100}% + ${['brave', 'duckduckgo', 'startpage', 'qwant', 'ecosia'].indexOf(searchEngine) * 8}px))` }} />
                      {[
                        { id: 'brave', label: 'Brave', domain: 'search.brave.com' },
                        { id: 'duckduckgo', label: 'DuckDuckGo', domain: 'duckduckgo.com' },
                        { id: 'startpage', label: 'Startpage', domain: 'startpage.com' },
                        { id: 'qwant', label: 'Qwant', domain: 'qwant.com' },
                        { id: 'ecosia', label: 'Ecosia', domain: 'ecosia.org' }
                      ].map(engine => (
                        <Command.Item
                          key={engine.id}
                          data-kebo-item="true"
                          value={`search engine ${engine.label}`}
                          onSelect={() => setSearchEngine(engine.id as SearchEnginePref)}
                          className={`relative z-10 flex-1 flex items-center justify-center gap-2.5 py-3 text-[13px] rounded-full cursor-pointer transition-colors outline-none hover:bg-slate-200/50 dark:hover:bg-white/5 aria-selected:bg-slate-200/50 dark:aria-selected:bg-white/5 ${searchEngine === engine.id ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-neutral-400'}`}
                        >
                          <img src={`https://www.google.com/s2/favicons?sz=64&domain=${engine.domain}`} alt={engine.label} className="w-5 h-5 shrink-0 rounded-sm opacity-80 dark:opacity-90" />
                          <span className="hidden sm:inline whitespace-nowrap">{engine.label}</span>
                        </Command.Item>
                      ))}
                    </div>
                  </div>
                </Command.Group>



                {/* Row 4: Shortcuts */}
                <div className="flex flex-col pb-2">
                  <div className="flex items-center justify-between px-1 py-1.5">
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-400">Shortcuts</h3>
                    <button 
                      onClick={() => {
                        if (typeof chrome !== 'undefined' && chrome.runtime) {
                          chrome.runtime.sendMessage({ type: 'OPEN_SHORTCUTS_SETTINGS' });
                        }
                      }}
                      className="text-[10px] font-medium text-slate-500 dark:text-neutral-400 bg-slate-200/50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 px-2 py-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer outline-none group shadow-sm"
                      title="Configure Shortcuts"
                    >
                      Edit
                      <svg className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </button>
                  </div>
                  <div className="bg-slate-100/50 dark:bg-neutral-900/40 p-3 rounded-[14px] border border-slate-200/60 dark:border-white/10 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 content-start">
                    {shortcuts.length > 0 ? shortcuts.map(cmd => (
                      <div key={cmd.name} className="flex justify-between items-center px-1 overflow-hidden">
                        <span className="text-[12px] font-normal text-slate-500 dark:text-neutral-500 truncate mr-3" title={cmd.description}>{cmd.description}</span>
                        <kbd className="text-[10px] text-slate-400 dark:text-neutral-400 font-mono tracking-widest bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/10 shadow-sm opacity-80 shrink-0">{cmd.shortcut}</kbd>
                      </div>
                    )) : (
                      <div className="col-span-full flex justify-center items-center py-4 opacity-50">
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400">Loading shortcuts...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-neutral-400 text-center px-4 pb-1">
                  <span className="font-semibold text-slate-700 dark:text-neutral-200">Note:</span> Some shortcuts may conflict with other apps or websites. Update accordingly if they fail to trigger.
                </div>

              </div>
            )}

            {isSelectingScope && (
              <Command.Group heading="Commands" className="text-xs font-normal text-slate-400 dark:text-neutral-500 px-2 py-2 [&_[cmdk-group-items]]:mt-2 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-2">
                {availableScopes
                  .filter(s => s.prefix.includes(searchQuery.toLowerCase()))
                  .map((scope) => (
                  <Command.Item 
                    key={scope.id}
                    data-kebo-item="true"
                    value={scope.prefix}
                    onSelect={() => {
                      setActiveScope(scope.id);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer text-[13px] text-slate-600 dark:text-neutral-400 border border-slate-200/40 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/5 aria-selected:bg-slate-100 dark:aria-selected:bg-white/10 aria-selected:border-slate-300/80 dark:aria-selected:border-white/10 aria-selected:shadow-sm aria-selected:text-slate-900 dark:aria-selected:text-white transition-all"
                  >
                    <svg className="w-4 h-4 text-slate-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={scope.icon} />
                    </svg>
                    <div className="flex flex-col">
                      <span className="font-normal text-slate-800 dark:text-neutral-200">{scope.label}</span>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-normal">Search through your {scope.label.toLowerCase()}</span>
                    </div>
                    <span className="ml-auto text-[10px] font-medium tracking-wider uppercase bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-white/10 px-2 py-0.5 rounded-full text-slate-500 dark:text-neutral-400 font-mono">
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
              <Command.Group className="[&_[cmdk-group-items]]:mt-1 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-2 px-2 pb-2">
                {results.map((item) => (
                  <Command.Item
                    key={item.id}
                    data-kebo-item="true"
                    value={item.id}
                    onSelect={() => handleResultSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer text-[13px] text-slate-600 dark:text-neutral-400 border border-slate-200/40 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/5 aria-selected:bg-slate-100 dark:aria-selected:bg-white/10 aria-selected:border-slate-300/80 dark:aria-selected:border-white/10 aria-selected:shadow-sm aria-selected:text-slate-900 dark:aria-selected:text-white transition-all group"
                  >
                    {item.type === 'tab' && <span className="text-[9px] font-normal tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 rounded-md font-mono">TAB</span>}
                    {item.type === 'bookmark' && <span className="text-[9px] font-normal tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 rounded-md font-mono">BM</span>}
                    {item.type === 'history' && <span className="text-[9px] font-normal tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 rounded-md font-mono">HIST</span>}
                    {item.type === 'closed' && <span className="text-[9px] font-normal tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-neutral-500 rounded-md font-mono">CLSD</span>}
                    
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-normal text-slate-800 dark:text-neutral-200 truncate">{item.title}</span>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-normal truncate group-aria-selected:text-slate-500 dark:group-aria-selected:text-neutral-400">{item.url}</span>
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
