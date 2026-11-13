import { useEffect } from 'react';
import { flushSync } from 'react-dom';

export type ColorSchemePref = 'system' | 'light' | 'dark';

let supportsDisplayTransition: boolean | undefined;

export function initPopoverPolyfillIfNeeded(): void {
  if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
    const cdnUrl = 'https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js';
    void import(/* @vite-ignore */ cdnUrl).catch(() => {
      // Offline graceful fallback
    });
  }
}

export function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

export function supportsTopLayerExit(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

export async function closeTopLayerDialog(dialog: HTMLDialogElement | null): Promise<void> {
  if (!dialog || !dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }

  if (dialog.open) {
    dialog.close();
  }
}

export function useDialogController(
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  onClose: () => void
): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.removeAttribute('data-closing');
      onClose();
    };

    const handleCancel = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
        void closeTopLayerDialog(dialog);
      }
    };

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        void closeTopLayerDialog(dialog);
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [dialogRef, onClose]);
}

export function runViewTransition(update: () => void): void {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(() => {
      flushSync(update);
    });
  } else {
    update();
  }
}

export function isImeComposing(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): boolean {
  const native = event.nativeEvent as KeyboardEvent;
  return Boolean(native.isComposing || native.keyCode === 229);
}

export function useScrollHideTopBar(barRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.CSS?.supports?.('container-type', 'scroll-state')) return;

    const bar = barRef.current;
    if (!bar) return;

    let lastY = window.scrollY;
    const onScroll = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.max(0, Math.min(window.scrollY, maxScroll));
      if (y === lastY) return;
      bar.classList.toggle('is-hidden', y > lastY && y > bar.offsetHeight);
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [barRef]);
}

export function readColorSchemePreference(): ColorSchemePref {
  try {
    const stored = localStorage.getItem('color-scheme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'system';
}

export function applyColorSchemePreference(pref: ColorSchemePref): void {
  try {
    if (pref === 'system') {
      localStorage.removeItem('color-scheme');
    } else {
      localStorage.setItem('color-scheme', pref);
    }
  } catch {
    // ignore
  }

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', pref === 'system' ? 'light dark' : pref);
  }
}
