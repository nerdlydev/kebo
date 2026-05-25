import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['sidePanel', 'tabs', 'tabGroups', 'storage'],
    host_permissions: ['<all_urls>'],
    action: {},
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K'
        },
        description: 'Open Kebo Command Bar'
      }
    }
  }
});
