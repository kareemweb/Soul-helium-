import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-strong fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/15 px-3.5 py-2 text-xs font-medium text-amber-100"
    >
      <WifiOff size={14} className="shrink-0 text-amber-300" />
      <span>Offline mode — reconnect to send messages</span>
    </div>
  );
}
