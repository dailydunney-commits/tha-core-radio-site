import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: false,
    message: "Stripe checkout is disabled. Use WhatsApp checkout instead.",
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe checkout is disabled. Use WhatsApp checkout instead.",
    },
    { status: 400 }
  );
}