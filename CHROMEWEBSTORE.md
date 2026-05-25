# Chrome Web Store Publication Checklist

## Overview
- **Name**: Kebo
- **Short Name**: Kebo
- **Description**: A lightning-fast, keyboard-centric command bar for your browser. Navigate, search, and manage tabs like a pro.
- **Version**: 1.0.0

## Permissions Justification

The Chrome Web Store requires a detailed justification for every permission requested in the manifest.

### `sidePanel`
**Why is it needed?**
Kebo uses the Side Panel API as its primary user interface. When the user invokes the global shortcut (`Cmd+Shift+K`), the extension opens the side panel to present the command bar interface without disrupting or injecting code into the active webpage.

### `tabs`
**Why is it needed?**
Kebo allows users to quickly jump to new URLs, open links in background tabs, and manage their current browsing session via the command bar. The `tabs` permission is strictly required to execute `chrome.tabs.create` and `chrome.tabs.update` commands based on user input.

### `tabGroups`
**Why is it needed?**
Kebo provides a feature to instantly group newly opened tabs (e.g. "Open in Tab Group"). This requires the `tabGroups` permission to interact with the browser's native tab grouping functionality.

### `storage`
**Why is it needed?**
Kebo uses the `storage` permission to save user preferences (like dark mode toggles or recent searches) locally on their device, ensuring a fast and customized experience across sessions.

### `host_permissions: ["<all_urls>"]`
**Why is it needed?**
Because Kebo operates from the Side Panel and acts as a global navigation tool, it needs the ability to execute navigation commands regardless of which website the user is currently viewing.

## Privacy & Data Use
- **Does the extension handle PII?** No.
- **Are you transmitting user data off the device?** No. All searches and preferences are stored entirely locally on the user's machine.
- **Do you use analytics?** Not currently implemented.

## Store Assets Needed
- [ ] 128x128 Icon (PNG)
- [ ] Store Logo (440x280)
- [ ] Promotional Marquee (1400x560)
- [ ] 1-5 Screenshots (1280x800 or 640x400) showing the Side Panel UI in action.

*Keep this document updated as permissions evolve.*
