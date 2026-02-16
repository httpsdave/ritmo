"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRadioStore } from "@/lib/store";

const STORAGE_KEY = "ritmo_welcome_dismissed";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed !== "true") {
        setShow(true);
      } else {
        // Modal was previously dismissed — user has already interacted before
        setUserHasInteracted(true);
      }
    } catch {
      setShow(true);
    }
  }, [setUserHasInteracted]);

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // quota exceeded
      }
    }
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      setUserHasInteracted(true);
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          fadeOut ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{ animation: fadeOut ? undefined : "modalAppear 0.4s ease-out" }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors p-1 z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-8 pt-10 pb-8 text-center">
          {/* Globe icon animation */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Ritmo
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-2">
            Discover radio stations from every corner of the world.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            Spin the globe, find a city, and tune in to live broadcasts. 
            Use the crosshair to lock onto nearby stations as you explore.
          </p>

          {/* Start Exploring button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm rounded-xl transition-colors mb-4"
          >
            Start Exploring
          </button>

          {/* Don't show again */}
          <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
            />
            <span className="text-xs text-zinc-500">
              Don&apos;t show this again
            </span>
          </label>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
