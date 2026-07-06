export default defineBackground(() => {
  // Auto-open on action icon click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Remove X-Frame-Options and CSP headers so websites load in the Side Panel iframe
  chrome.runtime.onInstalled.addListener(async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "X-Frame-Options", operation: "remove" },
              { header: "Content-Security-Policy", operation: "remove" }
            ]
          },
          condition: {
            resourceTypes: ["sub_frame"]
          }
        }
      ]
    }).catch(err => console.error("DNR Error:", err));
  });

  // Listen for Kebo Overlay commands
  chrome.commands.onCommand.addListener(async (command) => {
    let scopeToOpen = undefined;
    
    if (command === 'open_tabs_search') scopeToOpen = 'tabs';
    else if (command === 'open_history_search') scopeToOpen = 'history';
    else if (command === 'open_bookmarks_search') scopeToOpen = 'bookmarks';
    
    if (command === 'open_kebo_overlay' || scopeToOpen) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'TOGGLE_KEBO_OVERLAY', 
          scope: scopeToOpen 
        }).catch(err => {
          console.warn("Could not send toggle message to tab. Is the content script running?", err);
        });
      }
    }
  });
  // Listen for generic messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_SIDEBAR' && message.url) {
      chrome.storage.local.set({ sidebarUrl: message.url }, () => {
        if (sender.tab?.windowId) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
      });
    }
    
    if (message.type === 'OPEN_SHORTCUTS_SETTINGS') {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
    
    if (message.type === 'GET_SHORTCUTS') {
      chrome.commands.getAll((commands) => {
        sendResponse(commands);
      });
      return true; // Indicate that response will be sent asynchronously
    }

    if (message.type === 'FETCH_BROWSER_DATA') {
      const { scope } = message;
      (async () => {
        try {
          if (scope === 'tabs') {
            const tabs = await chrome.tabs.query({});
            sendResponse(tabs);
          } else if (scope === 'bookmarks') {
            const tree = await chrome.bookmarks.getTree();
            sendResponse(tree);
          } else if (scope === 'history') {
            const hist = await chrome.history.search({ text: '', maxResults: 2000, startTime: 0 });
            sendResponse(hist);
          } else if (scope === 'closed') {
            const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
            sendResponse(sessions);
          } else {
            sendResponse({ error: 'Unknown scope' });
          }
        } catch (err: any) {
          sendResponse({ error: err.message });
        }
      })();
      return true; // Indicate that response will be sent asynchronously
    }
  });

});
