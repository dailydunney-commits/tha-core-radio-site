import OwnerToolPage from "@/components/owner-tool-page";

export default function CashPotPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Cash Pot"
      title="Cash Pot / Lotto"
      subtitle="Cash Pot and lotto control shortcut for future live results, refresh button, and Supreme Ventures result reader."
      cards={[
        {
          title: "Cash Pot Results",
          text: "This page is ready for live Cash Pot result display and automatic refresh.",
        },
        {
          title: "Lotto Reader",
          text: "Future connection will read results and display last updated time.",
        },
        {
          title: "Radio Shortcut",
          text: "Use this from the control panel footer when managing listener tools.",
        },
      ]}
    />
  );
}
