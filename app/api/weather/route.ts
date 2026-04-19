import { NextResponse } from "next/server";

function weatherCodeToText(code: number) {
  const map: Record<number, string> = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    56: "light freezing drizzle",
    57: "dense freezing drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    66: "light freezing rain",
    67: "heavy freezing rain",
    71: "slight snow fall",
    73: "moderate snow fall",
    75: "heavy snow fall",
    77: "snow grains",
    80: "slight rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "slight snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with slight hail",
    99: "thunderstorm with heavy hail",
  };

  return map[code] || "unknown conditions";
}

export async function GET() {
  const lat = 17.9712;
  const lon = -76.7936;

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=America%2FJamaica`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Weather request failed." },
        { status: 500 }
      );
    }

    const current = result.current;

    if (!current) {
      return NextResponse.json(
        { error: "Weather data missing." },
        { status: 500 }
      );
    }

    const description = weatherCodeToText(current.weather_code);

    return NextResponse.json({
      city: "Kingston",
      tempC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      description,
      speechText: `Current weather for Kingston, Jamaica. ${description}. Temperature ${Math.round(
        current.temperature_2m
      )} degrees Celsius. Feels like ${Math.round(
        current.apparent_temperature
      )} degrees. Humidity ${current.relative_humidity_2m} percent.`,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load weather." },
      { status: 500 }
    );
  }
}