import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const listenUrl = `${API_BASE}/ara/content/listen/${channelId}/channel.mp3`;

  try {
    // Resolve the redirect to get actual stream URL
    let streamUrl = listenUrl;
    try {
      const redirectRes = await fetch(listenUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const loc = redirectRes.headers.get("location");
      if (loc) streamUrl = loc;
    } catch {
      // Fall through
    }

    // Proxy the audio stream
    const res = await fetch(streamUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "audio/mpeg, audio/*, */*",
      },
    });

    if (!res.body) {
      return new Response("No stream available", { status: 502 });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Stream error", { status: 502 });
  }
}

/**
 * POST: Resolve stream URL without proxying
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const listenUrl = `${API_BASE}/ara/content/listen/${channelId}/channel.mp3`;

  try {
    // Follow redirect chain
    let url = listenUrl;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const location = res.headers.get("location");
      if (location) {
        url = location;
      } else {
        break;
      }
    }

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to resolve stream" },
      { status: 502 }
    );
  }
}
