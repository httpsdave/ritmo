"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useRadioStore } from "@/lib/store";
import { COUNTRY_LABELS, CITY_LABELS } from "@/lib/geodata";
import type { Place } from "@/lib/types";

/* ── Constants ── */
const MAP_TEX_URL = "https://unpkg.com/three-globe@2.34.1/example/img/earth-blue-marble.jpg";
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const TAP_RADIUS = 20; // px radius for station tap detection

/* ── Equirectangular projection helpers ── */
function latLngToXY(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

function xyToLatLng(x: number, y: number, width: number, height: number) {
  const lng = (x / width) * 360 - 180;
  const lat = 90 - (y / height) * 180;
  return { lat, lng };
}

/* ── Main FlatMap Component ── */
export default function FlatMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const places = useRadioStore((s) => s.places);
  const setPopupPlace = useRadioStore((s) => s.setPopupPlace);
  const setCrosshairLocked = useRadioStore((s) => s.setCrosshairLocked);
  const setCrosshairLoading = useRadioStore((s) => s.setCrosshairLoading);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);

  const crosshairLocked = useRadioStore((s) => s.crosshairLocked);
  const stationLocked = useRadioStore((s) => s.stationLocked);
  const userHasInteracted = useRadioStore((s) => s.userHasInteracted);

  // Map state: pan offset + zoom
  const [zoom, setZoom] = useState(1.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // offset in map-pixel space

  // Image ref
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Drag state
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffX: number;
    startOffY: number;
    moved: boolean;
  } | null>(null);

  // Animation frame ref for rendering
  const rafRef = useRef<number>(0);
  const needsRender = useRef(true);

  // Load map texture
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      mapImgRef.current = img;
      setMapLoaded(true);
      needsRender.current = true;
    };
    img.src = MAP_TEX_URL;
  }, []);

  // Internal map size (the virtual size at zoom=1)
  const mapSize = useMemo(() => {
    if (!containerRef.current) return { w: 1920, h: 960 };
    return { w: 1920, h: 960 };
  }, []);

  // ── Render loop ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;
    const img = mapImgRef.current;
    if (!canvas || !ctx || !container || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.scale(dpr, dpr);

    // Compute zoomed map dimensions
    const zoomW = mapSize.w * zoom;
    const zoomH = mapSize.h * zoom;

    // Offset: map-space pixel offset (center of screen maps to center of map + offset)
    const drawX = cw / 2 - zoomW / 2 + offset.x;
    const drawY = ch / 2 - zoomH / 2 + offset.y;

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, cw, ch);

    // Draw map
    ctx.drawImage(img, drawX, drawY, zoomW, zoomH);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = latLngToXY(lat, 0, zoomW, zoomH);
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + y);
      ctx.lineTo(drawX + zoomW, drawY + y);
      ctx.stroke();
    }
    for (let lng = -150; lng <= 180; lng += 30) {
      const { x } = latLngToXY(0, lng, zoomW, zoomH);
      ctx.beginPath();
      ctx.moveTo(drawX + x, drawY);
      ctx.lineTo(drawX + x, drawY + zoomH);
      ctx.stroke();
    }

    // Draw station markers
    ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
    const dotSize = Math.max(1, zoom < 3 ? 1.5 : 2);
    for (const p of places) {
      const { x, y } = latLngToXY(p.geo[1], p.geo[0], zoomW, zoomH);
      const sx = drawX + x;
      const sy = drawY + y;
      // Cull off-screen markers
      if (sx < -5 || sx > cw + 5 || sy < -5 || sy > ch + 5) continue;
      ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
    }

    // Draw labels
    const labelsToShow: { name: string; sx: number; sy: number; isCountry: boolean }[] = [];

    // Countries — show at most zoom levels
    for (const label of COUNTRY_LABELS) {
      if (zoom < 1.2 && label.rank >= 3) continue;
      if (zoom < 1 && label.rank >= 2) continue;
      const { x, y } = latLngToXY(label.lat, label.lng, zoomW, zoomH);
      const sx = drawX + x;
      const sy = drawY + y;
      if (sx < -100 || sx > cw + 100 || sy < -20 || sy > ch + 20) continue;
      labelsToShow.push({ name: label.name, sx, sy, isCountry: true });
    }

    // Cities — show when zoomed in
    if (zoom >= 2) {
      for (const label of CITY_LABELS) {
        if (zoom < 3 && label.rank >= 3) continue;
        if (zoom < 2.5 && label.rank >= 2) continue;
        const { x, y } = latLngToXY(label.lat, label.lng, zoomW, zoomH);
        const sx = drawX + x;
        const sy = drawY + y;
        if (sx < -100 || sx > cw + 100 || sy < -20 || sy > ch + 20) continue;
        labelsToShow.push({ name: label.name, sx, sy, isCountry: false });
      }
    }

    // Render labels with shadow
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const l of labelsToShow) {
      const fontSize = l.isCountry
        ? Math.max(9, Math.min(14, zoom * 6))
        : Math.max(8, Math.min(11, zoom * 4));
      ctx.font = `${l.isCountry ? 600 : 400} ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = l.isCountry ? "rgba(255,255,255,0.75)" : "rgba(180,200,255,0.6)";
      ctx.fillText(l.name, l.sx, l.sy + (l.isCountry ? 0 : -6));
    }

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }, [zoom, offset, places, mapSize]);

  // Render on state change
  useEffect(() => {
    if (!mapLoaded) return;
    needsRender.current = true;
    rafRef.current = requestAnimationFrame(() => {
      render();
      needsRender.current = false;
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [render, mapLoaded]);

  // Also render on resize
  useEffect(() => {
    const handleResize = () => {
      needsRender.current = true;
      render();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  // ── Crosshair detection — find station nearest to screen center ──
  const crosshairLockedPlaceRef = useRef<string | null>(null);
  const crosshairCooldownRef = useRef(0);
  const CROSSHAIR_ENTER_PX = 40;
  const CROSSHAIR_EXIT_PX = 100;

  useEffect(() => {
    if (!userHasInteracted || stationLocked || !mapLoaded) return;

    // Debounce crosshair checks on pan/zoom
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container || places.length === 0) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const zoomW = mapSize.w * zoom;
      const zoomH = mapSize.h * zoom;
      const drawX = rect.width / 2 - zoomW / 2 + offset.x;
      const drawY = rect.height / 2 - zoomH / 2 + offset.y;

      let closestDist = CROSSHAIR_ENTER_PX;
      let closestPlace: Place | null = null;
      let lockedPlaceDist = Infinity;

      for (const p of places) {
        const pos = latLngToXY(p.geo[1], p.geo[0], zoomW, zoomH);
        const sx = drawX + pos.x;
        const sy = drawY + pos.y;
        const dx = sx - centerX;
        const dy = sy - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (crosshairLockedPlaceRef.current === p.id) {
          lockedPlaceDist = dist;
        }

        if (dist < closestDist) {
          closestDist = dist;
          closestPlace = p;
        }
      }

      // Keep current lock if still within exit radius
      if (crosshairLockedPlaceRef.current) {
        if (lockedPlaceDist < CROSSHAIR_EXIT_PX) {
          return; // keep lock
        } else {
          crosshairLockedPlaceRef.current = null;
          setCrosshairLocked(false);
          setCrosshairLoading(false);
        }
      }

      // Lock onto new station
      if (closestPlace && !crosshairLockedPlaceRef.current) {
        crosshairLockedPlaceRef.current = closestPlace.id;
        setCrosshairLocked(true, closestPlace.id);
        setCrosshairLoading(true);

        fetch(`/api/places/${closestPlace.id}/channels`)
          .then((r) => r.json())
          .then((data) => {
            const content = data?.data?.content;
            if (content && Array.isArray(content)) {
              for (const group of content) {
                if (group.items && Array.isArray(group.items)) {
                  const first = group.items[0];
                  const url = first?.page?.url ?? first?.href;
                  if (url) {
                    const channelId = url.split("/").pop();
                    if (channelId) {
                      fetch(`/api/channel/${channelId}`)
                        .then((r) => r.json())
                        .then((chData) => {
                          if (chData?.data) {
                            setCurrentChannel(chData.data);
                            setStreamUrl(`/api/stream/${channelId}`);
                            setIsPlaying(true);
                            setCrosshairLoading(false);
                          }
                        })
                        .catch(() => { setCrosshairLoading(false); });
                    }
                    return;
                  }
                }
              }
            }
            setCrosshairLoading(false);
          })
          .catch(() => { setCrosshairLoading(false); });
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [zoom, offset, places, mapSize, mapLoaded, userHasInteracted, stationLocked, setCrosshairLocked, setCrosshairLoading, setCurrentChannel, setStreamUrl, setIsPlaying]);

  // ── Find nearest station to screen point ──
  const findNearestStation = useCallback(
    (clientX: number, clientY: number): Place | null => {
      const container = containerRef.current;
      if (!container || places.length === 0) return null;

      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const cw = rect.width;
      const ch = rect.height;

      const zoomW = mapSize.w * zoom;
      const zoomH = mapSize.h * zoom;
      const drawX = cw / 2 - zoomW / 2 + offset.x;
      const drawY = ch / 2 - zoomH / 2 + offset.y;

      let closestDist = TAP_RADIUS;
      let closestPlace: Place | null = null;

      for (const p of places) {
        const { x, y } = latLngToXY(p.geo[1], p.geo[0], zoomW, zoomH);
        const sx = drawX + x;
        const sy = drawY + y;
        const dx = sx - px;
        const dy = sy - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestPlace = p;
        }
      }

      return closestPlace;
    },
    [places, zoom, offset, mapSize]
  );

  // ── Pointer events: drag to pan, tap to select station ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffX: offset.x,
        startOffY: offset.y,
        moved: false,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }

    setOffset({ x: drag.startOffX + dx, y: drag.startOffY + dy });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.moved) return;

      // It was a tap — show popup + snap crosshair to station
      const place = findNearestStation(e.clientX, e.clientY);
      if (place) {
        // Popup at screen center (where station will snap to via crosshair)
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        setPopupPlace(place, { x: screenCenterX, y: screenCenterY });

        // Pan the map so the tapped station is dead center of screen
        const zoomW = mapSize.w * zoom;
        const zoomH = mapSize.h * zoom;
        const stationPos = latLngToXY(place.geo[1], place.geo[0], zoomW, zoomH);
        // offset formula: drawX + stationPos.x = cw/2 => cw/2 - zoomW/2 + newOff + stationPos.x = cw/2
        const newOffX = zoomW / 2 - stationPos.x;
        const newOffY = zoomH / 2 - stationPos.y;
        setOffset({ x: newOffX, y: newOffY });

        // Lock crosshair + play the station
        setUserHasInteracted(true);
        crosshairLockedPlaceRef.current = place.id;
        setCrosshairLocked(true, place.id);
        setCrosshairLoading(true);

        fetch(`/api/places/${place.id}/channels`)
          .then((r) => r.json())
          .then((data) => {
            const content = data?.data?.content;
            if (content && Array.isArray(content)) {
              for (const group of content) {
                if (group.items && Array.isArray(group.items)) {
                  const first = group.items[0];
                  const url = first?.page?.url ?? first?.href;
                  if (url) {
                    const channelId = url.split("/").pop();
                    if (channelId) {
                      fetch(`/api/channel/${channelId}`)
                        .then((r) => r.json())
                        .then((chData) => {
                          if (chData?.data) {
                            setCurrentChannel(chData.data);
                            setStreamUrl(`/api/stream/${channelId}`);
                            setIsPlaying(true);
                            setCrosshairLoading(false);
                          }
                        })
                        .catch(() => { setCrosshairLoading(false); });
                    }
                    return;
                  }
                }
              }
            }
            setCrosshairLoading(false);
          })
          .catch(() => { setCrosshairLoading(false); });
      }
    },
    [findNearestStation, setPopupPlace, zoom, mapSize, setCrosshairLocked, setCrosshairLoading, setCurrentChannel, setStreamUrl, setIsPlaying, setUserHasInteracted]
  );

  // ── Wheel zoom ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta * z * 0.3)));
    },
    []
  );

  // ── Pinch zoom for touch ──
  const lastTouchDistRef = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastTouchDistRef.current !== null) {
        const scale = dist / lastTouchDistRef.current;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * scale)));
      }
      lastTouchDistRef.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ background: "#000", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-zinc-500 text-sm tracking-wide">Loading map...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
}
