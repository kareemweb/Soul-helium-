import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface Props {
  compact?: boolean;
}

export default function PWAInstallButton({ compact = false }: Props) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install Soul app"
        title="Install Soul"
        className="glass hover-lift flex h-10 items-center gap-2 rounded-2xl px-3 text-xs font-medium text-lilac hover:border-lilac/45 hover:text-white"
      >
        <Download size={15} />
        {!compact && <span className="hidden md:inline">Install Soul</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install Soul on iOS"
          title="Install Soul"
          className="glass hover-lift flex h-10 items-center gap-2 rounded-2xl px-3 text-xs font-medium text-lilac hover:border-lilac/45 hover:text-white"
        >
          <Download size={15} />
          {!compact && <span className="hidden md:inline">Install Soul</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-md">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              className="glass-strong w-full max-w-sm rounded-[24px] p-5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 id="ios-install-title" className="font-display text-xs uppercase tracking-[0.2em] text-white">
                  Install Soul
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install guide"
                  className="grid h-8 w-8 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <Share size={15} className="shrink-0 text-lilac" />
                  <span>
                    1. Tap <strong>Share</strong> in Safari&apos;s toolbar.
                  </span>
                </li>
                <li>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  3. Confirm the name <strong>Soul</strong> and tap <strong>Add</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-br from-soul to-nebula py-2.5 text-sm font-medium text-white"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
