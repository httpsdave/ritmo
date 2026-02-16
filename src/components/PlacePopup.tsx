"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, MapPin, X, Loader2 } from "lucide-react";
import { useRadioStore } from "@/lib/store";
import { extractChannelId } from "@/lib/utils";
import type { ChannelRef } from "@/lib/types";

export default function PlacePopup() {
  const popupPlace = useRadioStore((s) => s.popupPlace);
  const popupScreen = useRadioStore((s) => s.popupScreen);
  const setPopupPlace = useRadioStore((s) => s.setPopupPlace);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);
  const setSelectedPlace = useRadioStore((s) => s.setSelectedPlace);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);

  const [channels, setChannels] = useState<ChannelRef[]>([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch channels for the popup place
  useEffect(() => {
    if (!popupPlace) {
      setChannels([]);
      return;
    }

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/${popupPlace.id}/channels`);
        const data = await res.json();
        const content = data?.data?.content;
        if (content && Array.isArray(content)) {
          const items: ChannelRef[] = [];
          for (const group of content) {
            if (group.items && Array.isArray(group.items)) {
              for (const item of group.items) {
                if (item.href || item.page?.url) {
                  items.push(item);
                }
              }
            }
          }
          setChannels(items.slice(0, 5)); // Show first 5 stations
        }
      } catch {
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [popupPlace]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupPlace(null);
      }
    };
    if (popupPlace) {
      setTimeout(() => document.addEventListener("click", handleClick), 100);
    }
    return () => document.removeEventListener("click", handleClick);
  }, [popupPlace, setPopupPlace]);

  // No auto-dismiss — user closes via X or outside click

  const playStation = async (ch: ChannelRef) => {
    const url = ch.page?.url ?? ch.href;
    if (!url) return;
    const channelId = extractChannelId(url);
    if (!channelId) return;
    setUserHasInteracted(true);

    try {
      const res = await fetch(`/api/channel/${channelId}`);
      const data = await res.json();
      if (data?.data) {
        setCurrentChannel(data.data);
        setStreamUrl(`/api/stream/${channelId}`);
        setIsPlaying(true);
        setPopupPlace(null);
      }
    } catch {
      // silently fail
    }
  };

  if (!popupPlace || !popupScreen) return null;

  // Clamp popup position so it doesn't go off-screen
  const x = Math.min(Math.max(popupScreen.x, 160), window.innerWidth - 160);
  const y = Math.min(Math.max(popupScreen.y, 20), window.innerHeight - 200);

  return (
    <div
      ref={popupRef}
      className="fixed z-[55] pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -110%)",
      }}
    >
      {/* Arrow */}
      <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-zinc-900 border-r border-b border-zinc-700/50" />

      <div className="relative w-80 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/50">
          <MapPin size={13} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {popupPlace.title}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {popupPlace.country} · {popupPlace.size} stations
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPopupPlace(null);
            }}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>

        {/* Station list */}
        <div className="max-h-48 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="text-emerald-400 animate-spin" />
            </div>
          )}

          {!loading && channels.length === 0 && (
            <div className="py-4 text-center text-zinc-500 text-xs">
              No stations found
            </div>
          )}

          {!loading &&
            channels.map((ch, i) => {
              const url = ch.page?.url ?? ch.href;
              const title = ch.page?.title ?? ch.title ?? "Unknown station";
              const country = ch.page?.country?.title;
              return (
                <button
                  key={(url || "") + i}
                  onClick={(e) => {
                    e.stopPropagation();
                    playStation(ch);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                    <Radio size={11} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-200 truncate">{title}</p>
                    {country && (
                      <p className="text-[10px] text-zinc-500 truncate">{country}</p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>

        {/* View all button — opens sidebar */}
        {!loading && channels.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlace(popupPlace);
              setSidebarOpen(true);
              setPopupPlace(null);
            }}
            className="w-full px-5 py-3 text-xs text-emerald-400 hover:bg-zinc-800/60 transition-colors border-t border-zinc-800/50 text-center font-medium"
          >
            View all stations &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
