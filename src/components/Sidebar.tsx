"use client";

import { useEffect, useCallback } from "react";
import { X, Radio, Loader2, MapPin, Heart } from "lucide-react";
import { useRadioStore } from "@/lib/store";
import { extractChannelId } from "@/lib/utils";
import type { ChannelRef } from "@/lib/types";

export default function Sidebar() {
  const sidebarOpen = useRadioStore((s) => s.sidebarOpen);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);
  const selectedPlace = useRadioStore((s) => s.selectedPlace);
  const channels = useRadioStore((s) => s.channels);
  const channelsLoading = useRadioStore((s) => s.channelsLoading);
  const setChannels = useRadioStore((s) => s.setChannels);
  const setChannelsLoading = useRadioStore((s) => s.setChannelsLoading);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);
  const currentChannel = useRadioStore((s) => s.currentChannel);
  const favorites = useRadioStore((s) => s.favorites);
  const addFavorite = useRadioStore((s) => s.addFavorite);
  const removeFavorite = useRadioStore((s) => s.removeFavorite);

  /** Get the URL for a channel item — handles both old `href` and new `page.url` formats */
  const getChannelUrl = (ch: ChannelRef): string | undefined =>
    ch.page?.url ?? ch.href;

  /** Get the display title for a channel item */
  const getChannelTitle = (ch: ChannelRef): string =>
    ch.page?.title ?? ch.title ?? "Unknown station";

  /** Get the subtitle */
  const getChannelSubtitle = (ch: ChannelRef): string | undefined =>
    ch.page?.country?.title ?? ch.subtitle;

  // Fetch channels when place selected
  useEffect(() => {
    if (!selectedPlace) return;
    const fetchChannels = async () => {
      setChannelsLoading(true);
      setChannels([]);
      try {
        const res = await fetch(
          `/api/places/${selectedPlace.id}/channels`
        );
        const data = await res.json();
        const content = data?.data?.content;
        if (content && Array.isArray(content)) {
          // Merge all channel groups — accept items with href OR page.url
          const allItems: ChannelRef[] = [];
          for (const group of content) {
            if (group.items && Array.isArray(group.items)) {
              for (const item of group.items) {
                if (item.href || item.page?.url) {
                  allItems.push(item);
                }
              }
            }
          }
          setChannels(allItems);
        }
      } catch {
        setChannels([]);
      } finally {
        setChannelsLoading(false);
      }
    };
    fetchChannels();
  }, [selectedPlace, setChannels, setChannelsLoading]);

  const playChannel = useCallback(
    async (channel: ChannelRef) => {
      const url = channel.page?.url ?? channel.href;
      if (!url) return;
      const channelId = extractChannelId(url);
      if (!channelId) return;
      setUserHasInteracted(true);
      try {
        const channelRes = await fetch(`/api/channel/${channelId}`);
        const channelData = await channelRes.json();

        if (channelData?.data) {
          setCurrentChannel(channelData.data);
          setStreamUrl(`/api/stream/${channelId}`);
          setIsPlaying(true);
        }
      } catch {
        // Silently fail
      }
    },
    [setCurrentChannel, setStreamUrl, setIsPlaying, setUserHasInteracted]
  );

  return (
    <>
      {/* Backdrop - closes sidebar when clicked */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-72 max-w-[85vw] sm:w-80
          bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800/50
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-zinc-800/50"
          style={{ height: 'var(--header-height)', paddingTop: '2px' }}
        >
          <div className="min-w-0 flex-1">
            {selectedPlace ? (
              <>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-white truncate">
                    {selectedPlace.title}
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 pl-[22px]">
                  {selectedPlace.country} &middot; {selectedPlace.size}{" "}
                  stations
                </p>
              </>
            ) : (
              <h2 className="text-sm font-semibold text-zinc-400">
                No place selected
              </h2>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Channel list */}
        <div
          className="overflow-y-auto pb-4"
          style={{
            height: 'calc(100% - var(--header-height) - var(--nav-height) - var(--player-height) - env(safe-area-inset-bottom, 0px))',
          }}
        >
          {channelsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2
                size={20}
                className="text-emerald-400 animate-spin"
              />
            </div>
          )}

          {!channelsLoading && channels.length === 0 && selectedPlace && (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No stations found
            </div>
          )}

          {!channelsLoading &&
            channels.map((ch, i) => {
              const url = getChannelUrl(ch);
              if (!url) return null;
              const channelId = extractChannelId(url);
              const isActive = currentChannel?.id === channelId;
              const title = getChannelTitle(ch);
              const subtitle = getChannelSubtitle(ch);
              const isFav = favorites.some((f) => f.channelId === channelId);

              return (
                <div
                  key={url + i}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3
                    transition-colors
                    ${
                      isActive
                        ? "bg-emerald-500/10 border-l-2 border-emerald-500"
                        : "hover:bg-zinc-800/50 border-l-2 border-transparent"
                    }
                  `}
                >
                  <button
                    onClick={() => playChannel(ch)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${isActive ? "bg-emerald-500/20" : "bg-zinc-800"}
                      `}
                    >
                      <Radio
                        size={14}
                        className={
                          isActive ? "text-emerald-400" : "text-zinc-400"
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm truncate ${
                          isActive
                            ? "text-emerald-400 font-medium"
                            : "text-zinc-200"
                        }`}
                      >
                        {title}
                      </p>
                      {subtitle && (
                        <p className="text-xs text-zinc-500 truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                  {isActive && (
                    <span className="flex gap-[2px] items-end h-3 shrink-0">
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-bar1" />
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-bar2" />
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-bar3" />
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (isFav) {
                        removeFavorite(channelId);
                      } else {
                        addFavorite({
                          channelId,
                          title,
                          placeName: selectedPlace?.title ?? "",
                          country: selectedPlace?.country ?? "",
                          addedAt: Date.now(),
                        });
                      }
                    }}
                    className="shrink-0 p-1 transition-colors"
                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      size={14}
                      className={
                        isFav
                          ? "text-emerald-400 fill-emerald-400"
                          : "text-zinc-600 hover:text-emerald-400"
                      }
                    />
                  </button>
                </div>
              );
            })}
        </div>
      </aside>
    </>
  );
}
