"use client";

import { useEffect, useRef } from "react";

export default function SmartDJAutoBrain() {
  const busyRef = useRef(false);

  useEffect(() => {
    async function runSmartDjBrain(event: "tick" | "ended" = "tick") {
      if (busyRef.current) return;

      busyRef.current = true;

      try {
        await fetch("/api/radio/smartdj-auto-brain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event,
            source: "OWNER_PANEL_INVISIBLE_SMARTDJ_AUTO_BRAIN",
          }),
        });
      } catch {
        // Silent by design. This must not disturb the owner panel.
      } finally {
        busyRef.current = false;
      }
    }

    runSmartDjBrain("tick");

    const interval = window.setInterval(() => {
      runSmartDjBrain("tick");
    }, 15000);

    function onAudioEnded(event: Event) {
      const target = event.target as HTMLElement | null;

      if (target?.tagName?.toLowerCase() === "audio") {
        runSmartDjBrain("ended");
      }
    }

    document.addEventListener("ended", onAudioEnded, true);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("ended", onAudioEnded, true);
    };
  }, []);

  return null;
}
