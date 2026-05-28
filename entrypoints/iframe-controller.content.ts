export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  main() {
    // Hide scrollbars if this script is running inside the Kebo Split View iframe
    if (window.name === 'kebo-split-view') {
      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          background: transparent !important;
        }
        ::-webkit-scrollbar-track {
          background: transparent !important;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.3) !important;
          border-radius: 4px !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(150, 150, 150, 0.5) !important;
        }
        * {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(150, 150, 150, 0.3) transparent !important;
        }
      `;
      // Use document.documentElement or head depending on when the script runs
      (document.head || document.documentElement).appendChild(style);

      // Extract the background color of the current website to match Kebo's overscroll wrapper
      const sendBgColor = () => {
        let bg = window.getComputedStyle(document.body).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
          bg = window.getComputedStyle(document.documentElement).backgroundColor;
        }
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
          bg = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#000000' : '#ffffff';
        }
        window.parent.postMessage({ type: 'KEBO_IFRAME_BG_COLOR', color: bg }, '*');
      };

      // Send on initial load
      if (document.readyState === 'complete') {
        sendBgColor();
      } else {
        window.addEventListener('load', sendBgColor);
      }
      
      // Also send it immediately just in case the DOM is already partially parsed
      sendBgColor();
    }

    window.addEventListener('message', (event) => {
      if (event.data === '__KEBO_RELOAD_IFRAME__') {
        window.location.reload();
      }
    });
  },
});
