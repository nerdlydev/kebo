import { useCallback, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useActiveTabNavigation = () => {
  const splitUrl = useAppStore((state: any) => state.splitUrl);
  const [isReloading, setIsReloading] = useState(false);

  const goBack = useCallback(() => {
    if (splitUrl) {
      window.history.back();
    }
  }, [splitUrl]);

  const goForward = useCallback(() => {
    if (splitUrl) {
      window.history.forward();
    }
  }, [splitUrl]);

  const reload = useCallback(() => {
    if (splitUrl) {
      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        setIsReloading(true);
        
        // Dim and blur the iframe to provide a visual cue
        iframe.style.filter = 'blur(4px) brightness(0.6)';
        iframe.style.transition = 'filter 0.3s ease-in-out';
        
        iframe.contentWindow.postMessage('__KEBO_RELOAD_IFRAME__', '*');
        
        // Re-enable visual state after a short delay
        setTimeout(() => {
          setIsReloading(false);
          if (document.querySelector('iframe')) {
             document.querySelector('iframe')!.style.filter = 'none';
          }
        }, 600);
      }
    }
  }, [splitUrl]);

  return {
    splitUrl,
    canGoBack: true, // Always enabled since we can't reliably read cross-origin history
    canGoForward: true,
    isReloading,
    goBack,
    goForward,
    reload
  };
};
