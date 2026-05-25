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
});
