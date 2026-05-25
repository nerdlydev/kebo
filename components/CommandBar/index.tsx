import React from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '../../store/useAppStore';

export const CommandBar = () => {
  const { searchQuery, setSearchQuery } = useAppStore();

  const handleOpenCurrent = async () => {
    if (!searchQuery) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url: getUrl(searchQuery) });
    }
  };

  const handleOpenNew = async () => {
    if (!searchQuery) return;
    await chrome.tabs.create({ url: getUrl(searchQuery) });
  };

  const handleOpenGroup = async () => {
    if (!searchQuery) return;
    const tab = await chrome.tabs.create({ url: getUrl(searchQuery) });
    if (tab?.id) {
      const group = await chrome.tabs.group({ tabIds: tab.id });
      await chrome.tabGroups.update(group, { title: 'Kebo', color: 'blue' });
    }
  };

  const getUrl = (query: string) => {
    if (query.startsWith('http://') || query.startsWith('https://')) return query;
    if (query.includes('.') && !query.includes(' ')) return `https://${query}`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950/80 text-neutral-200">
      <Command 
        className="flex flex-col h-full bg-transparent overflow-hidden rounded-xl border border-white/10 shadow-2xl"
        label="Global Command Menu"
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10" cmdk-input-wrapper="">
          <Command.Input 
            autoFocus
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="w-full bg-transparent text-lg outline-none placeholder:text-neutral-500" 
            placeholder="Type a URL or search..." 
          />
        </div>

        <Command.List className="flex-1 overflow-y-auto p-2 scroll-smooth">
          <Command.Empty className="p-4 text-sm text-neutral-400 text-center">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-medium text-neutral-500 px-2 py-1 [&_[cmdk-group-items]]:mt-1">
            <Command.Item 
              onSelect={handleOpenCurrent}
              className="flex items-center px-2 py-2 rounded-md cursor-pointer text-sm text-neutral-300 hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white transition-colors"
            >
              Open in Current Tab
            </Command.Item>
            
            <Command.Item 
              onSelect={handleOpenNew}
              className="flex items-center px-2 py-2 rounded-md cursor-pointer text-sm text-neutral-300 hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white transition-colors"
            >
              Open in New Tab
            </Command.Item>
            
            <Command.Item 
              onSelect={handleOpenGroup}
              className="flex items-center px-2 py-2 rounded-md cursor-pointer text-sm text-neutral-300 hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white transition-colors"
            >
              Open in New Tab Group
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};
