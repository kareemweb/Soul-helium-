import { PanelLeft, SquarePen } from "lucide-react";
import { SoulMark } from "./Logo";
import ModelSelector from "./ModelSelector";

interface Props {
  sidebarOpen: boolean;
  thinking: boolean;
  model: string;
  onModel: (id: string) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const iconBtn =
  "glass hover-lift grid h-10 w-10 place-items-center rounded-2xl text-white/70 hover:text-white";

export default function TopBar({ sidebarOpen, thinking, model, onModel, onToggleSidebar, onNewChat }: Props) {
  return (
    <header className="relative z-30 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          title="Toggle sidebar (Ctrl/⌘ + B)"
          className={iconBtn}
        >
          <PanelLeft size={19} />
        </button>
        <div className="flex items-center gap-2.5" aria-label="SOUL">
          <SoulMark size={30} thinking={thinking} glow={false} className="h-[30px] w-auto" />
          <span
            className="hidden font-display text-[13px] font-medium uppercase text-white/90 md:inline"
            style={{ letterSpacing: "0.45em" }}
          >
            SOUL
          </span>
        </div>
      </div>

      <ModelSelector value={model} onChange={onModel} />

      <div className="flex justify-end">
        <button onClick={onNewChat} aria-label="New chat" title="New chat (Ctrl/⌘ + K)" className={iconBtn}>
          <SquarePen size={18} />
        </button>
      </div>
    </header>
  );
}
