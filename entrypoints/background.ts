export default defineBackground(() => {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-command-bar') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    }
  });

  // Also auto-open on action icon click as a fallback
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
