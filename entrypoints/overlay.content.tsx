import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CommandBar } from '../components/CommandBar';
import { ThemeProvider } from '../components/ThemeProvider';
import '../assets/tailwind.css'; // WXT will inject this into the shadow root automatically

function OverlayApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [initialScope, setInitialScope] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'TOGGLE_KEBO_OVERLAY') {
        if (msg.scope) {
          setInitialScope(msg.scope);
          if (isOpen) {
             // Just update scope if already open
          } else {
             setIsOpen(true);
             setIsClosing(false);
          }
        } else {
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
            setIsClosing(false);
          }
        }
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150); // Match animation duration
  };

  if (!isOpen) return null;

  return (
    <ThemeProvider>
      <div 
        className={`fixed inset-0 z-[2147483647] pointer-events-auto bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 kebo-base ${isClosing ? 'animate-out fade-out duration-150 ease-in' : 'animate-in fade-in duration-150 ease-out'}`}
        onClick={(e) => {
          // If they click the backdrop, close the overlay
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
        onKeyDown={(e) => {
          // Prevent the underlying webpage from intercepting Kebo's keyboard shortcuts
          e.stopPropagation();
        }}
      >
        <div className={`flex items-start gap-4 w-full max-w-[700px] ${isClosing ? 'animate-out fade-out zoom-out-[0.98] slide-out-to-bottom-1 duration-150 ease-in' : 'animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-2 duration-150 ease-out'}`}>
          {/* The Bubble outside the search bar */}
          <div className="mt-1 flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-3xl backdrop-saturate-150 shadow-sm border border-white/60 dark:border-white/10">
            <svg className="w-5 h-5 text-slate-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* The Main Command Bar */}
          <div className="flex-1 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-3xl backdrop-saturate-150 rounded-[32px] shadow-xl overflow-hidden border border-white/60 dark:border-white/10 flex flex-col transition-all duration-300 ease-out">
            <CommandBar isOverlay={true} initialScope={initialScope} onClose={handleClose} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx: any) {
    const ui = await createShadowRootUi(ctx, {
      name: 'kebo-overlay-shadow-root',
      position: 'inline', // We manually position the host
      onMount: (container: HTMLElement) => {
        // Force the shadow host to have maximum z-index and not block clicks when closed
        const host = container.getRootNode();
        if (host && 'host' in host) {
          const wrapper = (host as ShadowRoot).host as HTMLElement;
          wrapper.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            background: transparent !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          `;
        }

        const root = createRoot(container);
        root.render(<OverlayApp />);
        return root;
      },
      onRemove: (root: any) => {
        root?.unmount();
      }
    });

    // We mount the UI immediately, but OverlayApp handles its own internal `isOpen` state,
    // meaning the React tree is active to listen for background messages, but renders `null` initially.
    ui.mount();
  }
});
