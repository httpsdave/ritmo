"use client";

import { X, Volume2, Info, ExternalLink } from "lucide-react";
import { useRadioStore } from "@/lib/store";

export default function SettingsPanel() {
  const activeTab = useRadioStore((s) => s.activeTab);
  const setActiveTab = useRadioStore((s) => s.setActiveTab);
  const volume = useRadioStore((s) => s.volume);
  const setVolume = useRadioStore((s) => s.setVolume);
  const currentChannel = useRadioStore((s) => s.currentChannel);

  if (activeTab !== "settings") return null;

  const sheetBottom = currentChannel
    ? "calc(var(--player-height) + var(--nav-height) + env(safe-area-inset-bottom, 0px))"
    : "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))";

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/40"
        onClick={() => setActiveTab("explore")}
      />
      <div
        data-panel="sheet"
        data-playing={currentChannel ? "true" : "false"}
        className="fixed left-0 right-0 z-35 flex flex-col bg-zinc-900 border-t border-zinc-700/50 rounded-t-2xl shadow-2xl pointer-events-auto lg:right-auto lg:left-6 lg:w-[420px] lg:rounded-2xl lg:border lg:border-zinc-700/50"
        style={{ bottom: sheetBottom, maxHeight: "60vh" }}
      >
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <button
              onClick={() => setActiveTab("explore")}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-3">
          {/* Volume */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
            <div className="flex items-center gap-2.5 mb-3">
              <Volume2 size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Volume</span>
              <span className="ml-auto text-xs text-zinc-500">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5"
            />
          </div>

          {/* About */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
            <div className="flex items-center gap-2.5 mb-2">
              <Info size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">About</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">ritmo</strong> lets you discover radio stations from around the globe. Spin the globe, find a city, and tune in.
            </p>
            <p className="text-[11px] text-zinc-600 mt-2">
              Data provided by Radio Garden API
            </p>
          </div>

          {/* Credits */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/30">
            <div className="flex items-center gap-2.5 mb-3">
              <ExternalLink size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Credits</span>
            </div>

            {/* GitHub Profile */}
            <a
              href="https://github.com/httpsdave"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/30 hover:border-zinc-600/50 transition-colors mb-3"
            >
              <img
                src="https://github.com/httpsdave.png"
                alt="httpsdave"
                className="w-10 h-10 rounded-full ring-1 ring-zinc-700"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">httpsdave</p>
                <p className="text-xs text-zinc-500">github.com/httpsdave</p>
              </div>
              <ExternalLink size={13} className="ml-auto text-zinc-600 shrink-0" />
            </a>

            {/* Tech Stack */}
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {["Next.js", "React", "TypeScript", "Three.js", "React Three Fiber", "Zustand", "Tailwind CSS"].map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-zinc-700/50 text-zinc-300 border border-zinc-700/30"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
