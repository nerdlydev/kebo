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
});
