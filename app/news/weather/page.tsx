// app/weather/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function WeatherPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Weather"
      title="Weather Reader"
      subtitle="Weather reader page for website, app, and automated radio announcements."
      cards={[
        { title: "Montego Bay", text: "Weather slot for Montego Bay and western Jamaica." },
        { title: "Storm Alerts", text: "Emergency weather and storm announcement area." },
        { title: "Auto Reader", text: "Future connection point for automatic voice weather reads." },
      ]}
    />
  );
}