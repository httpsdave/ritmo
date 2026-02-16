import { NextResponse } from "next/server";

const API_BASE = "https://radio.garden/api";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/geo`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Geo lookup failed" },
      { status: 500 }
    );
  }
}
