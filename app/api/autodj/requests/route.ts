import { NextResponse } from "next/server";

const BASE = "http://18.222.11.16/api";
const STATION_ID = 1;

export async function GET() {
  try {
    const res = await fetch(`${BASE}/station/${STATION_ID}/requests`, {
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: "fetch failed",
    });
  }
}