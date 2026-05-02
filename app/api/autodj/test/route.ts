import { NextResponse } from "next/server";

const AZURACAST_API_KEY = "3dba543a4cbda0c6:cfac30cf13c8b524fb0407457f148ae4" 

export async function GET() {
  return NextResponse.json({
    hasKey: Boolean(AZURACAST_API_KEY),
    keyLength: AZURACAST_API_KEY.length,
    message: "Test route working",
  });
}