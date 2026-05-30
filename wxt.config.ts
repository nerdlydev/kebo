import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['sidePanel', 'tabs', 'scripting', 'tabGroups', 'storage', 'declarativeNetRequest', 'bookmarks', 'history', 'sessions'],
    host_permissions: ['<all_urls>'],
    action: {},
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+L',
          mac: 'Command+Shift+L'
        },
        description: 'Open Kebo Command Bar in Side Panel'
      },
      open_kebo_overlay: {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K'
        },
        description: 'Open Kebo Overlay'
      },
      open_tabs_search: {
        suggested_key: {
          default: 'Ctrl+Shift+T',
          mac: 'Command+Shift+T'
        },
        description: 'Open Kebo Tabs Search'
      },
      open_history_search: {
        description: 'Open Kebo History Search (Unbound by default)'
      },
      open_bookmarks_search: {
        description: 'Open Kebo Bookmarks Search (Unbound by default)'
      }
    }
  }
});
