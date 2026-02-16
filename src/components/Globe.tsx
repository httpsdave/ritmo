"use client";

import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Sphere, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useRadioStore } from "@/lib/store";
import { latLngToVector3 } from "@/lib/utils";
import type { Place } from "@/lib/types";

const GLOBE_RADIUS = 2;
const CROSSHAIR_RADIUS_PX = 40; // Matches the w-20 h-20 (80px / 2) crosshair circle
const TAP_SCREEN_RADIUS = 30; // px radius for tap-to-select on mobile/desktop

/* ── Earth sphere with real NASA texture ── */
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  const [dayMap, bumpMap] = useLoader(THREE.TextureLoader, [
    "https://unpkg.com/three-globe@2.34.1/example/img/earth-blue-marble.jpg",
    "https://unpkg.com/three-globe@2.34.1/example/img/earth-topology.png",
  ]);

  return (
    <Sphere ref={meshRef} args={[GLOBE_RADIUS, 48, 48]}>
      <meshStandardMaterial
        map={dayMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        roughness={0.7}
        metalness={0.0}
        emissiveMap={dayMap}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={0.45}
      />
    </Sphere>
  );
}

/* ── Fallback earth (dark sphere shown while texture loads) ── */
function EarthFallback() {
  return (
    <Sphere args={[GLOBE_RADIUS, 48, 48]}>
      <meshStandardMaterial
        color="#1a2a4e"
        emissive="#0d1a3a"
        emissiveIntensity={0.3}
        roughness={0.9}
      />
    </Sphere>
  );
}

/* ── Grid lines on globe surface (single draw call) ── */
function GlobeGrid() {
  const gridLine = useMemo(() => {
    const r = GLOBE_RADIUS + 0.003;
    const allPoints: number[] = [];

    // Latitude lines every 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lng = 0; lng < 360; lng += 4) {
        const [x1, y1, z1] = latLngToVector3(lat, lng - 180, r);
        const [x2, y2, z2] = latLngToVector3(lat, lng - 176, r);
        allPoints.push(x1, y1, z1, x2, y2, z2);
      }
    }

    // Longitude lines every 30°
    for (let lng = -180; lng < 180; lng += 30) {
      for (let lat = -90; lat < 90; lat += 4) {
        const [x1, y1, z1] = latLngToVector3(lat, lng, r);
        const [x2, y2, z2] = latLngToVector3(lat + 4, lng, r);
        allPoints.push(x1, y1, z1, x2, y2, z2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(allPoints, 3));
    const mat = new THREE.LineBasicMaterial({
      color: "#ffffff",
      opacity: 0.07,
      transparent: true,
    });
    return new THREE.LineSegments(geo, mat);
  }, []);

  return <primitive object={gridLine} />;
}

/* ── Station markers using GPU Points (tiny green pixels, like radio.garden) ── */
function StationMarkers({ places }: { places: Place[] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera, gl } = useThree();
  const setPopupPlace = useRadioStore((s) => s.setPopupPlace);

  // Track pointer for tap detection
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Pre-compute positions buffer once
  const positions = useMemo(() => {
    if (places.length === 0) return new Float32Array(0);
    const arr = new Float32Array(places.length * 3);
    for (let i = 0; i < places.length; i++) {
      const [x, y, z] = latLngToVector3(
        places[i].geo[1],
        places[i].geo[0],
        GLOBE_RADIUS + 0.005
      );
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [places]);

  // Screen-space tap detection — find nearest station to tap point
  const findNearestStation = useCallback(
    (clientX: number, clientY: number): Place | null => {
      if (!pointsRef.current || places.length === 0) return null;

      const rect = gl.domElement.getBoundingClientRect();
      const groupMatrix = pointsRef.current.parent?.matrixWorld ?? new THREE.Matrix4();
      const vec = new THREE.Vector3();
      const camPos = camera.position;

      let closestDist = TAP_SCREEN_RADIUS;
      let closestPlace: Place | null = null;

      for (let i = 0; i < places.length; i++) {
        vec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        vec.applyMatrix4(groupMatrix);

        // Quick back-face cull: skip markers on far side of globe
        const dx = vec.x - camPos.x;
        const dy = vec.y - camPos.y;
        const dz = vec.z - camPos.z;
        const toCenterX = -camPos.x;
        const toCenterY = -camPos.y;
        const toCenterZ = -camPos.z;
        const distToMarker = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ);
        if (distToMarker > distToCenter + GLOBE_RADIUS * 0.3) continue;

        // Project to screen
        const projected = vec.clone().project(camera);
        const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
        const screenY = ((-projected.y + 1) / 2) * rect.height + rect.top;

        const sdx = screenX - clientX;
        const sdy = screenY - clientY;
        const dist = Math.sqrt(sdx * sdx + sdy * sdy);

        if (dist < closestDist) {
          closestDist = dist;
          closestPlace = places[i];
        }
      }

      return closestPlace;
    },
    [places, positions, camera, gl]
  );

  // Listen for pointer events on the canvas element directly
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down) return;

      // Check if it was a tap (not a drag)
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = Date.now() - down.time;
      if (dist > 12 || elapsed > 400) return;

      const place = findNearestStation(e.clientX, e.clientY);
      if (place) {
        const rect = canvas.getBoundingClientRect();
        setPopupPlace(place, { x: e.clientX - rect.left + rect.left, y: e.clientY - rect.top + rect.top });
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, findNearestStation, setPopupPlace]);

  if (places.length === 0) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={places.length}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#22c55e"
        size={2.5}
        sizeAttenuation={false}
        toneMapped={false}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Atmosphere glow ── */
function Atmosphere() {
  return (
    <>
      <Sphere args={[GLOBE_RADIUS + 0.06, 32, 32]}>
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
      <Sphere args={[GLOBE_RADIUS + 0.15, 32, 32]}>
        <meshBasicMaterial
          color="#2244aa"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
    </>
  );
}

/* ── Camera controller that responds to globe target changes ── */
function CameraController() {
  const { camera } = useThree();
  const globeTarget = useRadioStore((s) => s.globeTarget);
  const targetRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (globeTarget) {
      const [x, y, z] = latLngToVector3(
        globeTarget.lat,
        globeTarget.lng,
        3.2
      );
      targetRef.current = new THREE.Vector3(x, y, z);
    }
  }, [globeTarget]);

  useFrame(() => {
    if (targetRef.current) {
      camera.position.lerp(targetRef.current, 0.06);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(targetRef.current) < 0.08) {
        targetRef.current = null;
      }
    }
  });

  return null;
}

/* ── Crosshair signal detector — projects stations to screen, locks on overlap with sticky lock ── */
const LOCK_ENTER_RADIUS = CROSSHAIR_RADIUS_PX; // px to enter lock
const LOCK_EXIT_RADIUS = CROSSHAIR_RADIUS_PX * 2.8; // px to break lock — much larger for stickiness

function CrosshairDetector({ places, groupRef }: { places: Place[]; groupRef: React.RefObject<THREE.Group | null> }) {
  const { camera, gl } = useThree();
  const setCrosshairLocked = useRadioStore((s) => s.setCrosshairLocked);
  const setCrosshairLoading = useRadioStore((s) => s.setCrosshairLoading);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const userHasInteracted = useRadioStore((s) => s.userHasInteracted);
  const stationLocked = useRadioStore((s) => s.stationLocked);

  const lockedPlaceRef = useRef<string | null>(null);
  const playingFromCrosshairRef = useRef(false);
  const cooldownRef = useRef(0);
  // Reusable vectors — no allocations in the hot loop
  const vec = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const toCenter = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);

  // Pre-compute positions array
  const positionsRef = useRef<Float32Array>(new Float32Array(0));
  useEffect(() => {
    const arr = new Float32Array(places.length * 3);
    for (let i = 0; i < places.length; i++) {
      const [x, y, z] = latLngToVector3(places[i].geo[1], places[i].geo[0], GLOBE_RADIUS + 0.005);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    positionsRef.current = arr;
  }, [places]);

  useFrame(() => {
    if (places.length === 0) return;
    if (!userHasInteracted) return;
    if (stationLocked) return;

    // Throttle: check every ~8 frames
    cooldownRef.current++;
    if (cooldownRef.current < 8) return;
    cooldownRef.current = 0;

    const rect = gl.domElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const pos = positionsRef.current;

    let closestDist = Infinity;
    let closestPlace: Place | null = null;
    let lockedPlaceScreenDist = Infinity;

    const groupMatrix = groupRef.current ? groupRef.current.matrixWorld : new THREE.Matrix4();
    const camPosLen = camera.position.length();

    for (let i = 0; i < places.length; i++) {
      vec.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      vec.applyMatrix4(groupMatrix);

      // Quick back-face cull using squared distances (avoid sqrt)
      camDir.subVectors(vec, camera.position);
      const distSq = camDir.lengthSq();
      const threshold = camPosLen + GLOBE_RADIUS * 0.3;
      if (distSq > threshold * threshold) continue;

      // Project to screen (reuse vector)
      projected.copy(vec).project(camera);
      const screenX = ((projected.x + 1) / 2) * rect.width;
      const screenY = ((-projected.y + 1) / 2) * rect.height;

      const dx = screenX - centerX;
      const dy = screenY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lockedPlaceRef.current && places[i].id === lockedPlaceRef.current) {
        lockedPlaceScreenDist = dist;
      }

      if (dist < LOCK_ENTER_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestPlace = places[i];
      }
    }

    // If we have a lock, keep it unless user moves far enough away
    if (lockedPlaceRef.current) {
      if (lockedPlaceScreenDist < LOCK_EXIT_RADIUS) {
        return;
      } else {
        lockedPlaceRef.current = null;
        playingFromCrosshairRef.current = false;
        setCrosshairLocked(false);
        setCrosshairLoading(false);
      }
    }

    // Try to lock onto a new station
    if (closestPlace && !lockedPlaceRef.current) {
      lockedPlaceRef.current = closestPlace.id;
      setCrosshairLocked(true, closestPlace.id);
      setCrosshairLoading(true);

      playingFromCrosshairRef.current = true;
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
                        if (chData?.data && playingFromCrosshairRef.current) {
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
  });

  return null;
}

/* ── Zoom handler that responds to button clicks ── */
function ZoomHandler() {
  const { camera } = useThree();

  useEffect(() => {
    const handleZoom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const direction = detail === "in" ? -0.5 : 0.5;
      const currentDist = camera.position.length();
      const newDist = Math.max(2.8, Math.min(10, currentDist + direction));
      camera.position.normalize().multiplyScalar(newDist);
    };
    window.addEventListener("ritmo-zoom", handleZoom);
    return () => window.removeEventListener("ritmo-zoom", handleZoom);
  }, [camera]);

  return null;
}

/* ── Scene contents (wrapped in Suspense) ── */
function SceneContents({ places }: { places: Place[] }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 3, 5]} intensity={2.5} />
      <directionalLight position={[-4, -2, -5]} intensity={1.0} color="#6688cc" />

      {/* Space background */}
      <Stars radius={80} depth={60} count={2000} factor={3} saturation={0.1} fade speed={0} />

      <CrosshairDetector places={places} groupRef={groupRef} />
      <ZoomHandler />

      <group ref={groupRef}>
        <Earth />
        <GlobeGrid />
        <Atmosphere />
        <StationMarkers places={places} />
      </group>

      <CameraController />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2.8}
        maxDistance={10}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

/* ── Crosshair overlay ── */
function Crosshair() {
  const crosshairLocked = useRadioStore((s) => s.crosshairLocked);
  const crosshairLoading = useRadioStore((s) => s.crosshairLoading);

  // 3 states: idle (white dashed), loading (white dashed spinning), locked (green solid)
  const isLocked = crosshairLocked && !crosshairLoading;
  const isLoading = crosshairLocked && crosshairLoading;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        className={`transition-transform duration-300 ${
          isLocked ? "scale-90" : ""
        } ${isLoading ? "animate-spin" : ""}`}
        style={isLoading ? { animationDuration: "2s" } : undefined}
      >
        <circle
          cx="40"
          cy="40"
          r="37"
          fill="none"
          strokeWidth="2"
          className={`transition-all duration-300 ${
            isLocked
              ? "stroke-emerald-400"
              : "stroke-white/60"
          }`}
          strokeDasharray={isLocked ? "none" : "8 6"}
          strokeLinecap="round"
        />
      </svg>
      {/* Glow when locked */}
      {isLocked && (
        <div className="absolute w-20 h-20 rounded-full shadow-[0_0_24px_rgba(34,197,94,0.4)] transition-opacity duration-300" />
      )}
    </div>
  );
}

/* ── Locate-me button ── */
function LocateButton() {
  const setGlobeTarget = useRadioStore((s) => s.setGlobeTarget);
  const places = useRadioStore((s) => s.places);
  const setSelectedPlace = useRadioStore((s) => s.setSelectedPlace);
  const setSidebarOpen = useRadioStore((s) => s.setSidebarOpen);
  const setCrosshairLocked = useRadioStore((s) => s.setCrosshairLocked);
  const setCurrentChannel = useRadioStore((s) => s.setCurrentChannel);
  const setStreamUrl = useRadioStore((s) => s.setStreamUrl);
  const setIsPlaying = useRadioStore((s) => s.setIsPlaying);
  const setUserHasInteracted = useRadioStore((s) => s.setUserHasInteracted);
  const [locating, setLocating] = useState(false);

  // Find the nearest loaded place to a lat/lng
  const findNearestPlace = useCallback(
    (lat: number, lng: number) => {
      if (places.length === 0) return null;
      let best: Place | null = null;
      let bestDist = Infinity;
      for (const p of places) {
        const dlat = p.geo[1] - lat;
        const dlng = p.geo[0] - lng;
        const d = dlat * dlat + dlng * dlng;
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      return best;
    },
    [places]
  );

  // Auto-play the first channel of a place (locks crosshair on it)
  const autoPlayPlace = useCallback(
    (place: Place) => {
      setCrosshairLocked(true, place.id);
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
                        }
                      })
                      .catch(() => {});
                  }
                  return;
                }
              }
            }
          }
        })
        .catch(() => {});
    },
    [setCrosshairLocked, setCurrentChannel, setStreamUrl, setIsPlaying]
  );

  const navigateTo = useCallback(
    (lat: number, lng: number) => {
      // Navigate globe to the nearest station (not raw user location)
      const nearest = findNearestPlace(lat, lng);
      if (nearest) {
        // Point globe at the station's actual coordinates
        setGlobeTarget({ lat: nearest.geo[1], lng: nearest.geo[0] });
        setSelectedPlace(nearest);
        setSidebarOpen(true);
        // Auto-play + crosshair lock onto nearest station
        autoPlayPlace(nearest);
      } else {
        setGlobeTarget({ lat, lng });
      }
    },
    [setGlobeTarget, findNearestPlace, setSelectedPlace, setSidebarOpen, autoPlayPlace]
  );

  const handleLocate = useCallback(async () => {
    setLocating(true);
    setUserHasInteracted(true);

    const ipFallback = async () => {
      try {
        const res = await fetch("/api/geo");
        const data = await res.json();
        if (data?.latitude && data?.longitude) {
          navigateTo(data.latitude, data.longitude);
        }
      } catch {
        // silently fail
      }
      setLocating(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          navigateTo(pos.coords.latitude, pos.coords.longitude);
          setLocating(false);
        },
        () => {
          ipFallback();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      ipFallback();
    }
  }, [navigateTo, setUserHasInteracted]);

  return (
    <button
      onClick={handleLocate}
      className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-800 transition-colors group pointer-events-auto"
      aria-label="Go to my location"
      title="Go to my location"
    >
      {locating ? (
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-emerald-400 transition-colors">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      )}
    </button>
  );
}

/* ── Zoom Controls ── */
function ZoomControls() {
  return null; // Zoom is handled via GlobeControls
}

/* ── Right-side control buttons ── */
function ControlButtons() {
  const currentChannel = useRadioStore((s) => s.currentChannel);
  const stationLocked = useRadioStore((s) => s.stationLocked);
  const setStationLocked = useRadioStore((s) => s.setStationLocked);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener("click", handleClick);
    }
    return () => document.removeEventListener("click", handleClick);
  }, [showShareMenu]);

  const handleShare = async (type: "station" | "app") => {
    let url = window.location.origin;
    let text = "Check out Ritmo — discover radio stations from around the world!";

    if (type === "station" && currentChannel) {
      url = `https://ritmo-blond.vercel.app/listen/${currentChannel.id}`;
      text = `Listen to ${currentChannel.title} on Ritmo`;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Ritmo", text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowShareMenu(false);
  };

  return (
    <div
      className="fixed z-20 flex flex-col gap-2 items-center pointer-events-none"
      style={{
        right: '16px',
        bottom: 'calc(var(--nav-height) + var(--player-height) + env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      {/* Share button */}
      <div className="relative pointer-events-auto" ref={shareRef}>
        {showShareMenu && (
          <div className="absolute right-12 bottom-0 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in fade-in">
            <button
              onClick={() => handleShare("station")}
              disabled={!currentChannel}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span className="text-sm text-zinc-200">Share current station</span>
            </button>
            <button
              onClick={() => handleShare("app")}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/60 transition-colors border-t border-zinc-800/50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-sm text-zinc-200">Share Ritmo</span>
            </button>
            {copied && (
              <div className="px-4 py-2 text-xs text-emerald-400 border-t border-zinc-800/50 text-center">
                Link copied to clipboard!
              </div>
            )}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowShareMenu(!showShareMenu);
          }}
          className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-800 transition-colors group"
          aria-label="Share"
          title="Share"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-emerald-400 transition-colors">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>

      {/* Lock station button */}
      <button
        onClick={() => setStationLocked(!stationLocked)}
        className={`w-10 h-10 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-300 group pointer-events-auto ${
          stationLocked
            ? "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800"
        }`}
        aria-label={stationLocked ? "Unlock station" : "Lock station"}
        title={stationLocked ? "Unlock station" : "Lock station"}
      >
        {stationLocked ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 transition-transform duration-300 scale-110">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-emerald-400 transition-all duration-300">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        )}
      </button>

      {/* Zoom in */}
      <button
        onClick={() => {
          // Dispatch a custom event that OrbitControls can pick up
          window.dispatchEvent(new CustomEvent("ritmo-zoom", { detail: "in" }));
        }}
        className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-800 transition-colors group pointer-events-auto"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-emerald-400 transition-colors">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Zoom out */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("ritmo-zoom", { detail: "out" }));
        }}
        className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/50 flex items-center justify-center hover:bg-zinc-800 transition-colors group pointer-events-auto"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-emerald-400 transition-colors">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Locate me */}
      <LocateButton />
    </div>
  );
}

/* ── Main Globe component ── */
export default function Globe() {
  const places = useRadioStore((s) => s.places);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-zinc-500 text-sm tracking-wide">
          Loading globe...
        </div>
      </div>
    );
  }

  return (
    <>
      <Crosshair />
      <ControlButtons />
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: "#000000" }}
      >
        <React.Suspense
          fallback={
            <>
              <ambientLight intensity={0.3} />
              <directionalLight position={[5, 3, 5]} intensity={0.8} />
              <EarthFallback />
            </>
          }
        >
          <SceneContents places={places} />
        </React.Suspense>
      </Canvas>
    </>
  );
}
