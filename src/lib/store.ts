import { create } from "zustand";
import type { Place, ChannelRef, Channel } from "./types";

export type NavTab = "explore" | "favorites" | "browse" | "search" | "settings";

export interface FavoriteStation {
  channelId: string;
  title: string;
  placeName: string;
  country: string;
  addedAt: number;
}

// ── localStorage helpers ──
function loadFavorites(): FavoriteStation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ritmo_favorites");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: FavoriteStation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("ritmo_favorites", JSON.stringify(favs));
  } catch {
    // quota exceeded, silently fail
  }
}

interface RadioState {
  // Places / markers
  places: Place[];
  placesLoading: boolean;
  setPlaces: (places: Place[]) => void;
  setPlacesLoading: (v: boolean) => void;

  // Selected place
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;

  // Hovered / popup place (shown as tooltip on globe)
  popupPlace: Place | null;
  popupScreen: { x: number; y: number } | null;
  setPopupPlace: (place: Place | null, screen?: { x: number; y: number } | null) => void;

  // Channels for selected place
  channels: ChannelRef[];
  channelsLoading: boolean;
  setChannels: (channels: ChannelRef[]) => void;
  setChannelsLoading: (v: boolean) => void;

  // Currently playing
  currentChannel: Channel | null;
  streamUrl: string | null;
  isPlaying: boolean;
  volume: number;
  setCurrentChannel: (channel: Channel | null) => void;
  setStreamUrl: (url: string | null) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;

  // Globe camera target
  globeTarget: { lat: number; lng: number } | null;
  setGlobeTarget: (t: { lat: number; lng: number } | null) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Navigation tab
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  // Settings panel
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  // Close all panels (for mutual exclusion)
  closeAllPanels: () => void;

  // User interaction (prevents auto-play until user interacts)
  userHasInteracted: boolean;
  setUserHasInteracted: (v: boolean) => void;

  // Station lock (prevents crosshair from changing station)
  stationLocked: boolean;
  setStationLocked: (v: boolean) => void;

  // View mode
  viewMode: "globe" | "flat";
  setViewMode: (mode: "globe" | "flat") => void;
  toggleViewMode: () => void;

  // Crosshair lock-on
  crosshairLocked: boolean;
  crosshairLoading: boolean;
  crosshairPlaceId: string | null;
  setCrosshairLocked: (locked: boolean, placeId?: string | null) => void;
  setCrosshairLoading: (loading: boolean) => void;

  // Favorites
  favorites: FavoriteStation[];
  addFavorite: (station: FavoriteStation) => void;
  removeFavorite: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;
  initFavorites: () => void;
}

export const useRadioStore = create<RadioState>((set, get) => ({
  places: [],
  placesLoading: true,
  setPlaces: (places) => set({ places }),
  setPlacesLoading: (placesLoading) => set({ placesLoading }),

  selectedPlace: null,
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),

  popupPlace: null,
  popupScreen: null,
  setPopupPlace: (popupPlace, screen = null) => set({ popupPlace, popupScreen: screen }),

  channels: [],
  channelsLoading: false,
  setChannels: (channels) => set({ channels }),
  setChannelsLoading: (channelsLoading) => set({ channelsLoading }),

  currentChannel: null,
  streamUrl: null,
  isPlaying: false,
  volume: 0.8,
  setCurrentChannel: (currentChannel) => set({ currentChannel }),
  setStreamUrl: (streamUrl) => set({ streamUrl }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),

  globeTarget: null,
  setGlobeTarget: (globeTarget) => set({ globeTarget }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  activeTab: "explore",
  setActiveTab: (activeTab) => {
    // Close other panels when switching tabs
    set({ 
      activeTab,
      searchOpen: false,
      sidebarOpen: false,
      popupPlace: null,
      popupScreen: null,
    });
  },

  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  userHasInteracted: false,
  setUserHasInteracted: (userHasInteracted) => set({ userHasInteracted }),

  stationLocked: false,
  setStationLocked: (stationLocked) => set({ stationLocked }),

  crosshairLocked: false,
  crosshairLoading: false,
  crosshairPlaceId: null,
  setCrosshairLocked: (locked, placeId = null) => set({ crosshairLocked: locked, crosshairPlaceId: placeId }),
  setCrosshairLoading: (crosshairLoading) => set({ crosshairLoading }),

  viewMode: "globe",
  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === "globe" ? "flat" : "globe" })),

  closeAllPanels: () => set({
    searchOpen: false,
    sidebarOpen: false,
    settingsOpen: false,
    popupPlace: null,
    popupScreen: null,
    activeTab: "explore",
  }),

  favorites: [],
  addFavorite: (station) => {
    const current = get().favorites;
    if (current.some((f) => f.channelId === station.channelId)) return;
    const updated = [station, ...current];
    saveFavorites(updated);
    set({ favorites: updated });
  },
  removeFavorite: (channelId) => {
    const updated = get().favorites.filter((f) => f.channelId !== channelId);
    saveFavorites(updated);
    set({ favorites: updated });
  },
  isFavorite: (channelId) => {
    return get().favorites.some((f) => f.channelId === channelId);
  },
  initFavorites: () => {
    set({ favorites: loadFavorites() });
  },
}));
