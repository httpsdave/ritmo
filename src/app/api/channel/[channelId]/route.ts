import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  try {
    const res = await fetch(
      `${API_BASE}/ara/content/channel/${channelId}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 }
    );
  }
}
