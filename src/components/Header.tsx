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
          {/* Signal icon ((o)) */}
          <circle cx="12" cy="12" r="3" />
          <path d="M8.1 15.9A5.5 5.5 0 0 1 8.1 8.1" />
          <path d="M15.9 8.1a5.5 5.5 0 0 1 0 7.8" />
          <path d="M5.6 18.4A9 9 0 0 1 5.6 5.6" />
          <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
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
          {/* Map icon */}
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
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
    
    // Toggle: clicking the active tab again closes it (except "explore")
    if (activeTab === tab && tab !== "explore") {
      setActiveTab("explore");
    } else {
      setActiveTab(tab);
    }
  };

  // On desktop (lg), the player is taller (has station info row ~40px) and has bottom: 24px offset
  // Nav needs to sit above that with a gap

  const mobileBottom = currentChannel
    ? 'calc(var(--player-height) + env(safe-area-inset-bottom, 0px))'
    : 'env(safe-area-inset-bottom, 0px)';

  return (
    <>
      {/* Mobile nav */}
      <nav
        className="fixed left-0 right-0 z-40 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800/40 lg:hidden"
        style={{ bottom: mobileBottom }}
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

      {/* Desktop floating nav */}
      <nav
        className="hidden lg:block fixed z-40 left-6 w-[420px] rounded-2xl shadow-2xl border border-zinc-700/50 bg-zinc-900/90 backdrop-blur-xl"
        style={{
          bottom: currentChannel
            ? 'var(--desktop-nav-bottom-playing)'
            : 'var(--desktop-nav-bottom-idle)',
        }}
      >
        <div className="flex items-center justify-around" style={{ height: 'var(--nav-height)' }}>
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
    </>
  );
}
