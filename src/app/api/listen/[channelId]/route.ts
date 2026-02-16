import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const listenUrl = `${API_BASE}/ara/content/listen/${channelId}/channel.mp3`;

  try {
    // Follow redirects manually to extract the final stream URL
    let url = listenUrl;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Ritmo/1.0)",
        },
      });
      const location = res.headers.get("location");
      if (location) {
        url = location;
      } else {
        break;
      }
    }

    // If we resolved a different URL than the original, return it
    if (url !== listenUrl) {
      return NextResponse.json({ url });
    }

    // Try GET to follow redirects
    const getRes = await fetch(listenUrl, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Ritmo/1.0)",
      },
    });
    const getLocation = getRes.headers.get("location");
    if (getLocation) {
      return NextResponse.json({ url: getLocation });
    }

    // Fallback: return the Radio Garden URL — browser <audio> will follow 302
    return NextResponse.json({ url: listenUrl });
  } catch {
    return NextResponse.json({ url: listenUrl });
  }
}
