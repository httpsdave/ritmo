"use client";

import { useCallback, useState, useEffect } from "react";
import { X, Radio, MapPin, Globe, Loader2, ChevronLeft } from "lucide-react";
import { useRadioStore } from "@/lib/store";
import { extractChannelId } from "@/lib/utils";
import type { Place } from "@/lib/types";

interface FeaturedStation {
  title: string;
  placeName: string;
  country: string;
  placeId: string;
  description: string;
}

// Curated list of notable stations with descriptions (like radio.garden's Musical Roots)
const CURATED_STATIONS: FeaturedStation[] = [
  {
    title: "Zanzibar Taraab",
    placeName: "Zanzibar",
    country: "Tanzania",
    placeId: "X8gdhqgK",
    description:
      "Zanzibar is considered the original nineteenth century birthplace of taarab, a soulful music genre popular along the Swahili coast of Kenya and Tanzania. Taraab combines the many influences of Indian Ocean trade — pre-Islamic Swahili, Arabic and Indian rhythms, melodies, and poetic styles.",
  },
  {
    title: "BBM FM",
    placeName: "Yogyakarta",
    country: "Indonesia",
    placeId: "iR5wJW7W",
    description:
      "From the island that brought the world gamelan, a traditional Indonesian music ensemble, this Javanese station features gong orchestras, puppet theatre music (wayang), and many other local genres.",
  },
  {
    title: "Rádio Furacão 2000",
    placeName: "Rio de Janeiro RJ",
    country: "Brazil",
    placeId: "5gFwwwTb",
    description:
      "Furacão 2000 is a sound system and label that has been promoting baile funk, the hard-edged, heavy bass dance music of Rio de Janeiro's shantytowns, since the 1990s. Influenced by Miami bass, baile funk has become one of the most popular genres among Brazil's working classes.",
  },
  {
    title: "Raï FM",
    placeName: "Algiers",
    country: "Algeria",
    placeId: "TBR_GJWW",
    description:
      "Raï is a form of Algerian folk music that emerged in the 1920s from the port city of Oran. Blending traditional Bedouin instruments with Western electric guitars and synthesizers, raï became a voice of rebellion and social commentary across North Africa.",
  },
  {
    title: "Rádio Renascença",
    placeName: "Lisbon",
    country: "Portugal",
    placeId: "hSH7i_yW",
    description:
      "Portugal's rich musical tradition includes Fado, the melancholic urban folk music born in the streets and taverns of Lisbon. Characterized by mournful tunes and lyrics about the sea and longing, Fado is inscribed on UNESCO's Intangible Cultural Heritage list.",
  },
  {
    title: "Radio Mali",
    placeName: "Bamako",
    country: "Mali",
    placeId: "EvMpzuvR",
    description:
      "Bamako is the heart of West African music. From the ancient griots to modern desert blues, Mali's musical heritage spans the kora, balafon, and ngoni. Artists from this region have shaped global music with their hypnotic rhythms and storytelling traditions.",
  },
  {
    title: "Mirchi",
    placeName: "Mumbai",
    country: "India",
    placeId: "KNWmPKBt",
    description:
      "Mumbai is the home of Bollywood, the world's most prolific film industry. Its radio stations blend classical ragas with contemporary Hindi pop, creating the distinctive sound that soundtracks over a billion lives across the subcontinent.",
  },
  {
    title: "Rebétiko Radio",
    placeName: "Athens",
    country: "Greece",
    placeId: "pMnXIreN",
    description:
      "Rebétiko is the blues of Greece — urban folk music born in the working-class neighborhoods of Athens, Piraeus, and Thessaloniki. With roots in Asia Minor refugee communities, these songs of love, poverty, and the underworld are now celebrated as Greece's greatest musical contribution.",
  },
];

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
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);
  const currentChannel = useRadioStore((s) => s.currentChannel);

  const [view, setView] = useState<"featured" | "countries" | "cities">("featured");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "browse") {
      setView("featured");
      setSelectedCountry(null);
      setSearchQuery("");
    }
  }, [activeTab]);

  const countryGroups = groupByCountry(places);
  const countries = Object.keys(countryGroups).sort();
  const filteredCountries = searchQuery
    ? countries.filter((c) =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries;

  const handleSelectPlace = useCallback(
    (place: Place) => {
      setActiveTab("explore");
      setUserHasInteracted(true);
      setTimeout(() => {
        setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
        setSelectedPlace(place);
        setSidebarOpen(true);
      }, 50);
    },
    [setGlobeTarget, setSelectedPlace, setSidebarOpen, setActiveTab, setUserHasInteracted]
  );

  const handlePlayFeatured = useCallback(
    async (station: FeaturedStation) => {
      setPlayingId(station.placeId);
      setUserHasInteracted(true);
      try {
        const res = await fetch(`/api/places/${station.placeId}/channels`);
        const data = await res.json();
        const content = data?.data?.content;
        if (content && Array.isArray(content)) {
          for (const group of content) {
            if (group.items && Array.isArray(group.items)) {
              const first = group.items[0];
              const url = first?.page?.url ?? first?.href;
              if (url) {
                const channelId = extractChannelId(url);
                if (channelId) {
                  const chRes = await fetch(`/api/channel/${channelId}`);
                  const chData = await chRes.json();
                  if (chData?.data) {
                    setCurrentChannel(chData.data);
                    setStreamUrl(`/api/stream/${channelId}`);
                    setIsPlaying(true);
                  }
                }
                break;
              }
            }
          }
        }

        const place = places.find((p) => p.id === station.placeId);
        if (place) {
          setGlobeTarget({ lat: place.geo[1], lng: place.geo[0] });
        }
      } catch {
        // silently fail
      } finally {
        setPlayingId(null);
      }
    },
    [places, setCurrentChannel, setStreamUrl, setIsPlaying, setGlobeTarget, setUserHasInteracted]
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
        data-panel="sheet"
        data-playing={currentChannel ? "true" : "false"}
        className="fixed left-0 right-0 z-35 flex flex-col bg-zinc-900 border-t border-zinc-700/50 rounded-t-2xl shadow-2xl pointer-events-auto lg:right-auto lg:left-6 lg:w-[420px] lg:rounded-2xl lg:border lg:border-zinc-700/50"
        style={{ bottom: sheetBottom, maxHeight: "70vh" }}
      >
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2">
              {(view === "cities" || (view === "countries" && selectedCountry)) && (
                <button
                  onClick={() => {
                    if (view === "cities") {
                      setView("countries");
                      setSelectedCountry(null);
                    } else {
                      setView("featured");
                      setSelectedCountry(null);
                    }
                  }}
                  className="text-zinc-400 hover:text-white transition-colors mr-1"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="text-lg font-semibold text-white">
                {view === "cities" && selectedCountry
                  ? selectedCountry
                  : "Browse"}
              </h2>
            </div>
            <button
              onClick={() => setActiveTab("explore")}
              className="text-zinc-500 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab pills */}
          {view !== "cities" && (
            <div className="flex gap-2 px-5 pb-3">
              <button
                onClick={() => setView("featured")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  view === "featured"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:text-white"
                }`}
              >
                Musical Roots
              </button>
              <button
                onClick={() => setView("countries")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  view === "countries"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:text-white"
                }`}
              >
                By Country
              </button>
            </div>
          )}

          {view === "countries" && (
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
          ) : view === "featured" ? (
            /* ── Musical Roots / Featured Stations ── */
            <div className="px-2 space-y-5 pt-1 pb-2">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Discover the musical heritage of places around the world. Tap to
                tune in.
              </p>
              {CURATED_STATIONS.map((station) => (
                <button
                  key={station.placeId}
                  onClick={() => handlePlayFeatured(station)}
                  disabled={playingId === station.placeId}
                  className="w-full text-left group"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/20 transition-colors">
                      {playingId === station.placeId ? (
                        <Loader2
                          size={14}
                          className="text-emerald-400 animate-spin"
                        />
                      ) : (
                        <Radio
                          size={14}
                          className="text-zinc-400 group-hover:text-emerald-400 transition-colors"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-100 group-hover:text-emerald-400 transition-colors">
                        {station.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />
                        {station.placeName}, {station.country}
                      </p>
                    </div>
                  </div>
                  <div className="ml-1 border-l-2 border-emerald-500/30 pl-4 py-2">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {station.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : view === "countries" ? (
            /* ── Countries list ── */
            <div className="space-y-0.5">
              {filteredCountries.map((country) => {
                const cityCount = countryGroups[country].length;
                return (
                  <button
                    key={country}
                    onClick={() => {
                      setSelectedCountry(country);
                      setView("cities");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">
                        {country}
                      </p>
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
            /* ── Cities in selected country ── */
            <div className="space-y-0.5">
              {selectedCountry &&
                countryGroups[selectedCountry]
                  ?.sort((a, b) => b.size - a.size)
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
                        <p className="text-sm text-zinc-200 truncate">
                          {place.title}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {place.size}{" "}
                          {place.size === 1 ? "station" : "stations"}
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
