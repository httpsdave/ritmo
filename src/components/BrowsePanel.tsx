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

// Large pool of curated stations — a subset is shown each day, rotating daily
const ALL_CURATED_STATIONS: FeaturedStation[] = [
  // ── Africa ──
  {
    title: "Zanzibar Taraab",
    placeName: "Zanzibar",
    country: "Tanzania",
    placeId: "X8gdhqgK",
    description:
      "Zanzibar is the birthplace of taarab, a soulful genre popular along the Swahili coast. Taraab combines pre-Islamic Swahili, Arabic, and Indian rhythms, melodies, and poetic styles — a legacy of centuries of Indian Ocean trade.",
  },
  {
    title: "Radio Mali",
    placeName: "Bamako",
    country: "Mali",
    placeId: "EvMpzuvR",
    description:
      "Bamako is the heart of West African music. From ancient griots to modern desert blues, Mali's heritage spans the kora, balafon, and ngoni. Artists from this region have shaped global music with hypnotic rhythms and storytelling.",
  },
  {
    title: "Raï FM",
    placeName: "Algiers",
    country: "Algeria",
    placeId: "TBR_GJWW",
    description:
      "Raï emerged in 1920s Oran, blending Bedouin instruments with electric guitars and synthesizers. It became a voice of rebellion across North Africa and a bridge between traditional Maghreb sounds and modern pop.",
  },
  {
    title: "Capital FM",
    placeName: "Nairobi",
    country: "Kenya",
    placeId: "1m0FMjcB",
    description:
      "Nairobi is the beating heart of East African pop. From benga guitar to gengetone, the city's airwaves pulse with Swahili rhythms, Sheng slang, and the energy of one of Africa's fastest-growing music scenes.",
  },
  {
    title: "Radio Lomé",
    placeName: "Lomé",
    country: "Togo",
    placeId: "WJIqNgGl",
    description:
      "Togo's capital is a melting pot of highlife, afrobeat, and traditional Ewe drumming. Radio Lomé carries the sounds of a nation where music is inseparable from daily life, ceremony, and celebration.",
  },
  // ── Asia ──
  {
    title: "BBM FM",
    placeName: "Yogyakarta",
    country: "Indonesia",
    placeId: "iR5wJW7W",
    description:
      "From the island that gave the world gamelan, this Javanese station features gong orchestras, puppet theatre music (wayang), and the many local genres of Central Java.",
  },
  {
    title: "Mirchi",
    placeName: "Mumbai",
    country: "India",
    placeId: "KNWmPKBt",
    description:
      "Mumbai is home to Bollywood, the world's most prolific film industry. Its stations blend classical ragas with Hindi pop, creating the sound that soundtracks over a billion lives.",
  },
  {
    title: "J-Wave",
    placeName: "Tokyo",
    country: "Japan",
    placeId: "gWMkRF5B",
    description:
      "Tokyo's J-Wave is a window into Japan's eclectic music scene — from city pop and J-rock to enka and electronic. The station captures the restless creativity of one of the world's great cultural capitals.",
  },
  {
    title: "EBS FM",
    placeName: "Seoul",
    country: "South Korea",
    placeId: "gN5KxjPB",
    description:
      "Seoul is the epicenter of K-pop, but its radio reveals far more — trot ballads, indie rock, Korean jazz, and traditional gugak. The city's musical range mirrors its blend of ancient tradition and hyper-modernity.",
  },
  {
    title: "Lao National Radio",
    placeName: "Vientiane",
    country: "Laos",
    placeId: "iqJmVVRB",
    description:
      "Vientiane's airwaves carry the gentle melodies of Lao lam — a vocal tradition accompanied by the khene (bamboo mouth organ) that has enchanted audiences in mainland Southeast Asia for centuries.",
  },
  // ── Americas ──
  {
    title: "Rádio Furacão 2000",
    placeName: "Rio de Janeiro RJ",
    country: "Brazil",
    placeId: "5gFwwwTb",
    description:
      "Furacão 2000 has been promoting baile funk since the 1990s — the hard-edged, heavy-bass dance music of Rio's favelas. Influenced by Miami bass, it became one of Brazil's most popular working-class genres.",
  },
  {
    title: "Radio Havana Cuba",
    placeName: "Havana",
    country: "Cuba",
    placeId: "mfP7CLeB",
    description:
      "Havana is the cradle of son cubano, mambo, and salsa. The city's radio stations carry the rhythms of Afro-Cuban percussion, tres guitar, and the unmistakable brass that has influenced dance music worldwide.",
  },
  {
    title: "La Mega",
    placeName: "Bogotá",
    country: "Colombia",
    placeId: "RI5OM5OB",
    description:
      "Colombia's musical diversity is staggering — cumbia, vallenato, champeta, and reggaetón all find a home on Bogotá's airwaves. The country's rhythmic traditions draw from Indigenous, African, and Spanish roots.",
  },
  {
    title: "WBGO Jazz",
    placeName: "Newark NJ",
    country: "United States",
    placeId: "WNHdl7yW",
    description:
      "WBGO is one of America's premier jazz stations, broadcasting from the New York metro area. From bebop to avant-garde, it celebrates the art form born in New Orleans that became America's classical music.",
  },
  {
    title: "Radio Buenos Aires",
    placeName: "Buenos Aires",
    country: "Argentina",
    placeId: "F2DKE7GB",
    description:
      "Buenos Aires is the birthplace of tango — the passionate dance and music born in the port neighborhoods of La Boca and San Telmo. The bandoneón's melancholic voice still echoes through the city's milongas.",
  },
  {
    title: "Fiesta FM",
    placeName: "Mexico City",
    country: "Mexico",
    placeId: "lRbNHj7B",
    description:
      "Mexico City's sonic landscape stretches from mariachi and norteño to cumbia sonidera and modern Mexican indie. The capital's stations reflect a nation where music is woven into every fiesta and protest.",
  },
  // ── Europe ──
  {
    title: "Rádio Renascença",
    placeName: "Lisbon",
    country: "Portugal",
    placeId: "hSH7i_yW",
    description:
      "Portugal's Fado — melancholic urban folk born in Lisbon's streets and taverns — is inscribed on UNESCO's Intangible Cultural Heritage list. Its mournful tunes speak of the sea, longing, and saudade.",
  },
  {
    title: "Rebétiko Radio",
    placeName: "Athens",
    country: "Greece",
    placeId: "pMnXIreN",
    description:
      "Rebétiko is the blues of Greece — urban folk born in working-class Athens, Piraeus, and Thessaloniki. Rooted in Asia Minor refugee communities, these songs of love and hardship are Greece's greatest musical gift.",
  },
  {
    title: "FIP",
    placeName: "Paris",
    country: "France",
    placeId: "f2qBMqOB",
    description:
      "FIP is legendary for its eclectic programming — jazz, world music, chanson, electronic, and classical flow seamlessly together. It captures the cosmopolitan soul of Paris in a single radio stream.",
  },
  {
    title: "Flamenco Radio",
    placeName: "Seville",
    country: "Spain",
    placeId: "Hp8epk7W",
    description:
      "Seville is the heartland of flamenco — the passionate art of cante (song), toque (guitar), and baile (dance). Born from Andalusia's Roma, Moorish, and Jewish communities, flamenco is a UNESCO masterpiece.",
  },
  {
    title: "RTÉ Raidió na Gaeltachta",
    placeName: "Galway",
    country: "Ireland",
    placeId: "_rB32WOB",
    description:
      "Ireland's Irish-language station carries sean-nós singing, uilleann pipe tunes, and the lilting melodies of traditional céilí bands from the Gaeltacht regions of the west coast.",
  },
  {
    title: "Radio Romania Muzical",
    placeName: "Bucharest",
    country: "Romania",
    placeId: "6mPfYhGW",
    description:
      "Romania's musical heritage runs from the haunting panpipes of the carpatii to lăutari fiddle music and manele. Bucharest's stations reflect a crossroads of Balkan, Ottoman, and Central European sounds.",
  },
  // ── Middle East & Central Asia ──
  {
    title: "Sawt El Ghad",
    placeName: "Beirut",
    country: "Lebanon",
    placeId: "BVivb3OB",
    description:
      "Beirut has long been the cultural capital of the Arab world. Lebanese radio carries the legacy of Fairuz, Oum Kalthoum's influence, and a thriving underground electronic scene that bridges East and West.",
  },
  {
    title: "Javan Radio",
    placeName: "Tehran",
    country: "Iran",
    placeId: "WZU_Wk7B",
    description:
      "Iran's musical traditions span millennia — from classical Persian radif and the mystical poetry of Sufi music to modern Iranian pop. Tehran's stations carry this ancient yet evolving sonic heritage.",
  },
  // ── Oceania ──
  {
    title: "RNZ National",
    placeName: "Wellington",
    country: "New Zealand",
    placeId: "GxXhFVGB",
    description:
      "New Zealand's national broadcaster carries Māori waiata, Pacific reggae, and the indie sounds of Aotearoa. From haka chants to Flying Nun Records, the islands punch well above their weight musically.",
  },
  {
    title: "ABC Classic",
    placeName: "Sydney NSW",
    country: "Australia",
    placeId: "Py_PxXGB",
    description:
      "Australia's premier classical station blends European concert traditions with the sounds of the world's oldest living cultures — Aboriginal didgeridoo, clapsticks, and songlines that map the continent.",
  },
];

// Select a rotating subset of stations based on the current date
function getDailyStations(count: number = 8): FeaturedStation[] {
  const today = new Date();
  // Use day-of-year as seed so it changes daily
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  // Seeded shuffle using day-of-year
  const shuffled = [...ALL_CURATED_STATIONS];
  let seed = dayOfYear * 2654435761; // hash-like multiplier
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

const CURATED_STATIONS = getDailyStations(8);

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
