import { NextRequest, NextResponse } from "next/server";

const RADIO_BROWSER_API = "https://de1.api.radio-browser.info";

/**
 * Search Radio Browser API for stations by name or location.
 * This acts as a fallback when Radio Garden doesn't have data.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const country = searchParams.get("country") || "";
  const limit = searchParams.get("limit") || "20";

  try {
    let endpoint = `${RADIO_BROWSER_API}/json/stations/search`;
    const params = new URLSearchParams({
      limit,
      order: "clickcount",
      reverse: "true",
      hidebroken: "true",
    });

    if (name) params.set("name", name);
    if (country) params.set("country", country);

    const res = await fetch(`${endpoint}?${params}`, {
      headers: {
        "User-Agent": "Ritmo/1.0",
        Accept: "application/json",
      },
    });

    const data = await res.json();

    // Return simplified station data
    const stations = data.map(
      (s: {
        stationuuid: string;
        name: string;
        url_resolved: string;
        url: string;
        country: string;
        state: string;
        tags: string;
        favicon: string;
        codec: string;
        bitrate: number;
        geo_lat: number | null;
        geo_long: number | null;
      }) => ({
        id: s.stationuuid,
        title: s.name,
        streamUrl: s.url_resolved || s.url,
        country: s.country,
        state: s.state,
        tags: s.tags,
        favicon: s.favicon,
        codec: s.codec,
        bitrate: s.bitrate,
        geo: s.geo_lat && s.geo_long ? [s.geo_long, s.geo_lat] : null,
      })
    );

    return NextResponse.json({ stations });
  } catch {
    return NextResponse.json(
      { error: "Failed to search Radio Browser" },
      { status: 500 }
    );
  }
}
