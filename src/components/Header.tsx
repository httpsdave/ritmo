"use client";

import { useRadioStore } from "@/lib/store";
import type { NavTab } from "@/lib/store";

export default function Header() {
  const placesLoading = useRadioStore((s) => s.placesLoading);
  const places = useRadioStore((s) => s.places);
  const isPlaying = useRadioStore((s) => s.isPlaying);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8" style={{ height: 'var(--header-height)' }}>
        {/* Logo text only - icon is in browser tab */}
        <div className="pointer-events-auto">
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">
            ritmo
          </h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 leading-none mt-0.5">
            world radio
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {isPlaying && (
            <span className="flex gap-[2px] items-end h-3">
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bar1" />
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bar2" />
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bar3" />
            </span>
          )}
          {!placesLoading && (
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 hidden sm:block">
              {places.length.toLocaleString()} cities
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Bottom navigation bar ── */
export function BottomNav() {
  const activeTab = useRadioStore((s) => s.activeTab);
  const setActiveTab = useRadioStore((s) => s.setActiveTab);
  const setSearchOpen = useRadioStore((s) => s.setSearchOpen);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);
  const setPopupPlace = useRadioStore((s) => s.setPopupPlace);
  const currentChannel = useRadioStore((s) => s.currentChannel);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "explore",
      label: "Explore",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      id: "favorites",
      label: "Favorites",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === "favorites" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      id: "browse",
      label: "Browse",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      id: "search",
      label: "Search",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      ),
    },
  ];

  const handleTabClick = (tab: NavTab) => {
    // Close other panels first
    setSidebarOpen(false);
    setPopupPlace(null);
    
    if (tab === "search") {
      setSearchOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <nav
      className="fixed left-0 right-0 z-40 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800/40"
      style={{
        bottom: currentChannel
          ? 'calc(var(--player-height) + env(safe-area-inset-bottom, 0px))'
          : 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto" style={{ height: 'var(--nav-height)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
