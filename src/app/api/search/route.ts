import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ hits: { hits: [] } });
  }
  try {
    const res = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
