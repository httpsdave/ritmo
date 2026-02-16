"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search as SearchIcon, X, Radio, MapPin } from "lucide-react";
import { useRadioStore } from "@/lib/store";
import { extractChannelId, extractPlaceId } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchOpen = useRadioStore((s) => s.searchOpen);
  const setSearchOpen = useRadioStore((s) => s.setSearchOpen);
  const places = useRadioStore((s) => s.places);
  const setSelectedPlace = useRadioStore((s) => s.setSelectedPlace);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setGlobeTarget = useRadioStore((s) => s.setGlobeTarget);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data?.hits?.hits || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch]
  );

  /** Get the URL from a search result (handles nested page format) */
  const getResultUrl = (r: SearchResult): string =>
    r._source.page?.url ?? r._source.url ?? "";

  /** Get the title from a search result */
  const getResultTitle = (r: SearchResult): string =>
    r._source.page?.title ?? r._source.title ?? "Unknown";

  /** Get the subtitle from a search result */
  const getResultSubtitle = (r: SearchResult): string =>
    r._source.page?.subtitle ?? r._source.subtitle ?? "";

  const handleSelectChannel = useCallback(
    async (result: SearchResult) => {
      const url = getResultUrl(result);
      const channelId = extractChannelId(url);
      if (!channelId) return;
      try {
        const channelRes = await fetch(`/api/channel/${channelId}`);
        const channelData = await channelRes.json();

        if (channelData?.data) {
          setCurrentChannel(channelData.data);
          setStreamUrl(`/api/stream/${channelId}`);
          setIsPlaying(true);

          // Navigate globe to station's place
          const placeId = channelData.data.place?.id;
          const place = places.find((p) => p.id === placeId);
          if (place) {
            setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
            setSelectedPlace(place);
            setSidebarOpen(true);
          }
        }
      } catch {
        // Silently fail
      }
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    },
    [
      places,
      setCurrentChannel,
      setStreamUrl,
      setIsPlaying,
      setGlobeTarget,
      setSelectedPlace,
      setSidebarOpen,
      setSearchOpen,
    ]
  );

  const handleSelectPlace = useCallback(
    (result: SearchResult) => {
      const url = getResultUrl(result);
      const placeId = extractPlaceId(url);
      let place = places.find((p) => p.id === placeId);

      // Fallback: try matching by title if ID doesn't match
      if (!place) {
        const title = getResultTitle(result).toLowerCase();
        place = places.find((p) => p.title.toLowerCase() === title);
      }

      if (place) {
        setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
        setSelectedPlace(place);
        setSidebarOpen(true);
      }
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    },
    [places, setGlobeTarget, setSelectedPlace, setSidebarOpen, setSearchOpen]
  );

  const handleSelectCountry = useCallback(
    (result: SearchResult) => {
      const title = getResultTitle(result);
      // Find all places that belong to this country, pick the largest one
      const countryPlaces = places
        .filter((p) => p.country.toLowerCase() === title.toLowerCase())
        .sort((a, b) => b.size - a.size);

      if (countryPlaces.length > 0) {
        const place = countryPlaces[0];
        setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
        setSelectedPlace(place);
        setSidebarOpen(true);
      }
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    },
    [places, setGlobeTarget, setSelectedPlace, setSidebarOpen, setSearchOpen]
  );

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setSearchOpen(false);
          setQuery("");
          setResults([]);
        }}
      />

      {/* Search card */}
      <div
        className="relative w-full max-w-lg mx-4 sm:mx-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in"
        style={{ marginTop: 'calc(var(--header-height) + 12px)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <SearchIcon size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search stations, cities, countries..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-500"
          />
          <button
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
              setResults([]);
            }}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="py-8 text-center text-zinc-500 text-sm">
              No results found
            </div>
          )}

          {!loading &&
            results.map((r, i) => {
              const url = getResultUrl(r);
              const title = getResultTitle(r);
              const subtitle = getResultSubtitle(r);
              return (
                <button
                  key={url || i}
                  onClick={() =>
                    r._source.type === "channel"
                      ? handleSelectChannel(r)
                      : r._source.type === "country"
                        ? handleSelectCountry(r)
                        : handleSelectPlace(r)
                  }
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    {r._source.type === "channel" ? (
                      <Radio size={13} className="text-emerald-400" />
                    ) : (
                      <MapPin size={13} className="text-cyan-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{subtitle}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 shrink-0">
                    {r._source.type}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
