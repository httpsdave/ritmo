"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Clock,
} from "lucide-react";
import { useRadioStore } from "@/lib/store";
import { extractChannelId, getTimezoneFromCoords } from "@/lib/utils";

function LocalTime({ placeId }: { placeId: string }) {
  const places = useRadioStore((s) => s.places);
  const [time, setTime] = useState("");

  useEffect(() => {
    const place = places.find((p) => p.id === placeId);
    if (!place) return;

    const [lng, lat] = place.geo;
    const timezone = getTimezoneFromCoords(lat, lng);

    const updateTime = () => {
      try {
        const now = new Date();
        const localTime = now.toLocaleTimeString("en-US", {
          timeZone: timezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        setTime(localTime);
      } catch {
        setTime("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [placeId, places]);

  if (!time) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500">
      <Clock size={12} />
      <span>{time}</span>
    </div>
  );
}

export default function Player() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const currentChannel = useRadioStore((s) => s.currentChannel);
  const streamUrl = useRadioStore((s) => s.streamUrl);
  const isPlaying = useRadioStore((s) => s.isPlaying);
  const volume = useRadioStore((s) => s.volume);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setVolume = useRadioStore((s) => s.setVolume);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const channels = useRadioStore((s) => s.channels);
  const favorites = useRadioStore((s) => s.favorites);
  const addFavorite = useRadioStore((s) => s.addFavorite);
  const removeFavorite = useRadioStore((s) => s.removeFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const isFav = currentChannel
    ? favorites.some((f) => f.channelId === currentChannel.id)
    : false;

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audio.volume = volume;
      
      // Sync playing state with actual audio events
      audio.addEventListener("playing", () => {
        setIsPlaying(true);
        setIsLoading(false);
      });
      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });
      audio.addEventListener("waiting", () => {
        setIsLoading(true);
      });
      audio.addEventListener("canplay", () => {
        setIsLoading(false);
      });
      
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When streamUrl changes, resolve direct URL first, then play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;

    if (loadedSrcRef.current !== streamUrl) {
      loadedSrcRef.current = streamUrl;
      setIsLoading(true);

      const channelId = streamUrl.split("/").pop();

      const tryPlay = (url: string, fallbackUrl?: string) => {
        audio.pause();
        audio.src = url;
        audio.load();

        const onError = () => {
          audio.removeEventListener("error", onError);
          if (fallbackUrl) {
            audio.src = fallbackUrl;
            audio.load();
            audio.play().catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
          } else {
            setIsPlaying(false);
            setIsLoading(false);
          }
        };
        audio.addEventListener("error", onError, { once: true });

        const onPlaying = () => {
          audio.removeEventListener("error", onError);
          audio.removeEventListener("playing", onPlaying);
        };
        audio.addEventListener("playing", onPlaying, { once: true });

        audio.play().catch(() => {
          setTimeout(() => {
            audio.play().catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
          }, 500);
        });
      };

      const loadStream = async () => {
        try {
          const res = await fetch(`/api/stream/${channelId}`, { method: "POST" });
          const data = await res.json();
          if (data.url) {
            tryPlay(data.url, streamUrl);
            return;
          }
        } catch {
          // POST resolution failed
        }
        tryPlay(streamUrl);
      };

      loadStream();
    }
  }, [streamUrl, setIsPlaying]);

  // Handle play/pause toggling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl || loadedSrcRef.current !== streamUrl) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, streamUrl, setIsPlaying]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!streamUrl) return;
    setIsPlaying(!isPlaying);
  }, [isPlaying, streamUrl, setIsPlaying]);

  const prevVolumeRef = useRef(0.8);
  const toggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume; // save current volume before muting
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 0.8); // restore previous volume
    }
  }, [volume, setVolume]);

  const skipStation = useCallback(
    async (direction: 1 | -1) => {
      if (!currentChannel || channels.length === 0) return;

      // Find current channel index in the channels list
      const currentIndex = channels.findIndex((ch) => {
        const url = ch.page?.url ?? ch.href;
        return url ? extractChannelId(url) === currentChannel.id : false;
      });

      // Wrap around
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + channels.length) % channels.length;

      const nextCh = channels[nextIndex];
      const url = nextCh?.page?.url ?? nextCh?.href;
      if (!url) return;
      const channelId = extractChannelId(url);
      if (!channelId) return;

      try {
        const res = await fetch(`/api/channel/${channelId}`);
        const data = await res.json();
        if (data?.data) {
          setCurrentChannel(data.data);
          setStreamUrl(`/api/stream/${channelId}`);
          setIsPlaying(true);
        }
      } catch {
        // silently fail
      }
    },
    [currentChannel, channels, setCurrentChannel, setStreamUrl, setIsPlaying]
  );

  const toggleFavorite = useCallback(() => {
    if (!currentChannel) return;
    if (isFav) {
      removeFavorite(currentChannel.id);
    } else {
      addFavorite({
        channelId: currentChannel.id,
        title: currentChannel.title,
        placeName: currentChannel.place?.title ?? "",
        country: currentChannel.country?.title ?? "",
        addedAt: Date.now(),
      });
    }
  }, [currentChannel, isFav, addFavorite, removeFavorite]);

  if (!currentChannel) return null;

  return (
    <div
      className="fixed z-50 left-0 right-0 bottom-0 lg:left-6 lg:right-auto lg:bottom-6 lg:w-[420px] lg:rounded-2xl lg:shadow-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 lg:border lg:rounded-2xl lg:border-zinc-700/50">
        {/* Station info row — visible on desktop, integrated on mobile */}
        <div className="hidden lg:flex items-center gap-3 px-5 pt-4 pb-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-400 truncate leading-snug">
              {currentChannel.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-zinc-500 truncate leading-snug">
                {currentChannel.place?.title}
                {currentChannel.country?.title
                  ? ` · ${currentChannel.country.title}`
                  : ""}
              </p>
              {currentChannel.place?.id && (
                <LocalTime placeId={currentChannel.place.id} />
              )}
            </div>
          </div>
          <button
            onClick={toggleFavorite}
            className="shrink-0 p-1.5 transition-colors"
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={16}
              className={
                isFav
                  ? "text-emerald-400 fill-emerald-400"
                  : "text-zinc-500 hover:text-emerald-400"
              }
            />
          </button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-5 py-3 max-w-screen-lg mx-auto" style={{ height: 'var(--player-height)' }}>
          {/* Previous station */}
          <button
            onClick={() => skipStation(-1)}
            disabled={channels.length === 0}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 disabled:opacity-30 shrink-0"
            aria-label="Previous station"
          >
            <SkipBack size={18} />
          </button>

          {/* Play button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} className="text-black" fill="black" />
            ) : (
              <Play size={18} className="text-black ml-0.5" fill="black" />
            )}
          </button>

          {/* Next station */}
          <button
            onClick={() => skipStation(1)}
            disabled={channels.length === 0}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 disabled:opacity-30 shrink-0"
            aria-label="Next station"
          >
            <SkipForward size={18} />
          </button>

          {/* Station info — mobile only */}
          <div className="flex-1 min-w-0 lg:hidden">
            <p className="text-sm font-medium text-emerald-400 truncate leading-snug">
              {currentChannel.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-zinc-500 truncate leading-snug">
                {currentChannel.place?.title}
                {currentChannel.country?.title
                  ? ` · ${currentChannel.country.title}`
                  : ""}
              </p>
              {currentChannel.place?.id && (
                <LocalTime placeId={currentChannel.place.id} />
              )}
            </div>
          </div>

          {/* Volume slider — desktop: fills remaining space */}
          <div className="hidden sm:flex items-center gap-2 lg:flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 lg:flex-1 accent-emerald-500 h-1"
            />
            <button
              onClick={toggleMute}
              className="text-zinc-500 hover:text-white transition-colors p-1"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          {/* Favorite — mobile only */}
          <button
            onClick={toggleFavorite}
            className="shrink-0 p-2 transition-colors lg:hidden"
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={18}
              className={
                isFav
                  ? "text-emerald-400 fill-emerald-400"
                  : "text-zinc-500 hover:text-emerald-400"
              }
            />
          </button>
        </div>
      </div>
    </div>
  );
}
