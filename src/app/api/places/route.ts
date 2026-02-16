import { NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/ara/content/places`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
