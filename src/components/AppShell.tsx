"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Header, { BottomNav } from "@/components/Header";
import Player from "@/components/Player";
import SearchPanel from "@/components/SearchPanel";
import Sidebar from "@/components/Sidebar";
import PlacePopup from "@/components/PlacePopup";
import FavoritesPanel from "@/components/FavoritesPanel";
import SettingsPanel from "@/components/SettingsPanel";
import BrowsePanel from "@/components/BrowsePanel";
import { useRadioStore } from "@/lib/store";

const Globe = dynamic(() => import("@/components/Globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500 text-xs tracking-wider uppercase">
          Initializing
        </span>
      </div>
    </div>
  ),
});

export default function AppShell() {
  const setPlaces = useRadioStore((s) => s.setPlaces);
  const setPlacesLoading = useRadioStore((s) => s.setPlacesLoading);
  const initFavorites = useRadioStore((s) => s.initFavorites);

  // Init favorites from localStorage
  useEffect(() => {
    initFavorites();
  }, [initFavorites]);

  // Fetch all places on mount
  useEffect(() => {
    const loadPlaces = async () => {
      setPlacesLoading(true);
      try {
        const res = await fetch("/api/places");
        const data = await res.json();
        if (data?.data?.list) {
          setPlaces(data.data.list);
        }
      } catch {
        console.error("Failed to load places");
      } finally {
        setPlacesLoading(false);
      }
    };
    loadPlaces();
  }, [setPlaces, setPlacesLoading]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a1a]">
      <Header />

      {/* Globe fills the screen */}
      <div className="absolute inset-0">
        <Globe />
      </div>

      <Sidebar />
      <PlacePopup />
      <FavoritesPanel />
      <BrowsePanel />
      <SettingsPanel />
      <SearchPanel />
      <BottomNav />
      <Player />
    </div>
  );
}
