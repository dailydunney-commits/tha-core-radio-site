import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const speechTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return NextResponse.json({
    timezone: "America/Jamaica",
    dateLabel,
    timeLabel,
    speechText: `The time in Jamaica is ${speechTime}.`,
    iso: now.toISOString(),
  });
}