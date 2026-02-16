"use client";

import { useCallback, useState, useEffect } from "react";
import { X, Radio, MapPin, Globe, Loader2 } from "lucide-react";
import { useRadioStore } from "@/lib/store";
import type { Place } from "@/lib/types";

function groupByCountry(places: Place[]): Record<string, Place[]> {
  const groups: Record<string, Place[]> = {};
  for (const place of places) {
    if (!groups[place.country]) {
      groups[place.country] = [];
    }
    groups[place.country].push(place);
  }
  return groups;
}

export default function BrowsePanel() {
  const activeTab = useRadioStore((s) => s.activeTab);
  const setActiveTab = useRadioStore((s) => s.setActiveTab);
  const places = useRadioStore((s) => s.places);
  const setGlobeTarget = useRadioStore((s) => s.setGlobeTarget);
  const setSelectedPlace = useRadioStore((s) => s.setSelectedPlace);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);
  const currentChannel = useRadioStore((s) => s.currentChannel);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeTab !== "browse") {
      setSelectedCountry(null);
      setSearchQuery("");
    }
  }, [activeTab]);

  const countryGroups = groupByCountry(places);
  const countries = Object.keys(countryGroups).sort();
  const filteredCountries = searchQuery
    ? countries.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
    : countries;

  const handleSelectPlace = useCallback(
    (place: Place) => {
      // Switch tab first (this closes sidebar), then set place & open sidebar after
      setActiveTab("explore");
      // Use setTimeout so the tab switch state settles before reopening sidebar
      setTimeout(() => {
        setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
        setSelectedPlace(place);
        setSidebarOpen(true);
      }, 50);
    },
    [setGlobeTarget, setSelectedPlace, setSidebarOpen, setActiveTab]
  );

  if (activeTab !== "browse") return null;

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
            <div className="flex items-center gap-2">
              {selectedCountry && (
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-zinc-400 hover:text-white transition-colors mr-1 text-lg"
                >
                  ←
                </button>
              )}
              <h2 className="text-lg font-semibold text-white">
                {selectedCountry || "Browse"}
              </h2>
            </div>
            <button
              onClick={() => setActiveTab("explore")}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
              <X size={18} />
            </button>
          </div>
          {!selectedCountry && (
            <div className="px-5 pb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          {places.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="text-emerald-400 animate-spin" />
            </div>
          ) : !selectedCountry ? (
            <div className="space-y-0.5">
              {filteredCountries.map((country) => {
                const cityCount = countryGroups[country].length;
                return (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{country}</p>
                      <p className="text-[11px] text-zinc-500">
                        {cityCount} {cityCount === 1 ? "city" : "cities"}
                      </p>
                    </div>
                    <span className="text-zinc-600 text-sm">→</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {countryGroups[selectedCountry]
                .sort((a, b) => b.size - a.size)
                .map((place) => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{place.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {place.size} {place.size === 1 ? "station" : "stations"}
                      </p>
                    </div>
                    <Radio size={13} className="text-zinc-600 shrink-0" />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
