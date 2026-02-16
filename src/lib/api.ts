const API_BASE = "https://radio.garden/api";

export async function fetchPlaces() {
  const res = await fetch(`${API_BASE}/ara/content/places`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch places");
  return res.json();
}

export async function fetchPlaceChannels(placeId: string) {
  const res = await fetch(
    `${API_BASE}/ara/content/page/${placeId}/channels`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function fetchChannel(channelId: string) {
  const res = await fetch(`${API_BASE}/ara/content/channel/${channelId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch channel");
  return res.json();
}

export async function fetchStreamUrl(channelId: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/ara/content/listen/${channelId}/channel.mp3`,
    { redirect: "manual" }
  );
  const location = res.headers.get("location");
  if (location) return location;
  // Fallback: return direct URL
  return `${API_BASE}/ara/content/listen/${channelId}/channel.mp3`;
}

export async function searchRadio(query: string) {
  const res = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function fetchGeo() {
  const res = await fetch(`${API_BASE}/geo`, { cache: "no-store" });
  if (!res.ok) throw new Error("Geo failed");
  return res.json();
}
