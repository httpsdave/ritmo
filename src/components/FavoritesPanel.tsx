"use client";

import { useCallback } from "react";
import { Heart, Radio, X, Trash2 } from "lucide-react";
import { useRadioStore } from "@/lib/store";

export default function FavoritesPanel() {
  const activeTab = useRadioStore((s) => s.activeTab);
  const favorites = useRadioStore((s) => s.favorites);
  const removeFavorite = useRadioStore((s) => s.removeFavorite);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const currentChannel = useRadioStore((s) => s.currentChannel);
  const setActiveTab = useRadioStore((s) => s.setActiveTab);

  const playFavorite = useCallback(
    async (fav: { channelId: string }) => {
      try {
        const res = await fetch(`/api/channel/${fav.channelId}`);
        const data = await res.json();
        if (data?.data) {
          setCurrentChannel(data.data);
          setStreamUrl(`/api/stream/${fav.channelId}`);
          setIsPlaying(true);
        }
      } catch {
        // silently fail
      }
    },
    [setCurrentChannel, setStreamUrl, setIsPlaying]
  );

  if (activeTab !== "favorites") return null;

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
        className="fixed left-0 right-0 z-35 flex flex-col bg-zinc-900 border-t border-zinc-700/50 rounded-t-2xl shadow-2xl pointer-events-auto"
        style={{ bottom: sheetBottom, maxHeight: "60vh" }}
      >
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3">
            <h2 className="text-lg font-semibold text-white">Favorites</h2>
            <button
              onClick={() => setActiveTab("explore")}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Heart size={32} className="text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">
                No favorites yet
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs">
                Tap the heart icon while listening to save stations here.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {favorites.map((fav) => {
                const isActive = currentChannel?.id === fav.channelId;
                return (
                  <div
                    key={fav.channelId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive ? "bg-emerald-500/10" : "hover:bg-zinc-800/60"
                    }`}
                  >
                    <button
                      onClick={() => playFavorite(fav)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? "bg-emerald-500/20" : "bg-zinc-800"
                        }`}
                      >
                        <Radio
                          size={14}
                          className={isActive ? "text-emerald-400" : "text-zinc-400"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm truncate ${
                            isActive ? "text-emerald-400 font-medium" : "text-zinc-200"
                          }`}
                        >
                          {fav.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {fav.placeName}{fav.country ? ` · ${fav.country}` : ""}
                        </p>
                      </div>
                    </button>

                    {isActive && (
                      <span className="flex gap-0.5 items-end h-3 shrink-0 mr-1">
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-bar1" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-bar2" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-bar3" />
                      </span>
                    )}

                    <button
                      onClick={() => removeFavorite(fav.channelId)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 shrink-0"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
