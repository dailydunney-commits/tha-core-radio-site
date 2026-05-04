import OwnerToolPage from "@/components/owner-tool-page";

export default function TimeReaderPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Time Reader"
      title="Time Reader"
      subtitle="Time reader control page for station time checks, time announcements, and future automated time-reader audio."
      cards={[
        {
          title: "Live Time Reader",
          text: "Use this page for the time reader system that will announce current time on the website, app, and radio tools.",
        },
        {
          title: "Automation Ready",
          text: "This page is ready for the next connection step: automatic time reader voice output.",
        },
        {
          title: "Back To Studio",
          text: "Return to the owner control panel to control the live radio studio.",
        },
      ]}
    />
  );
}
