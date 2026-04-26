"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!promptEvent) return;

    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  if (isStandalone) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-28 left-4 right-4 z-50 rounded-2xl border border-red-700 bg-black/95 p-4 text-sm text-white shadow-2xl">
        <p className="font-bold text-red-400">Install Tha Core Radio</p>
        <p className="mt-1 text-gray-300">
          On iPhone: tap Share, then tap Add to Home Screen.
        </p>
      </div>
    );
  }

  if (!promptEvent) return null;

  return (
    <button
      onClick={installApp}
      className="fixed bottom-28 right-4 z-50 rounded-full bg-red-700 px-5 py-3 font-bold text-white shadow-2xl hover:bg-red-600"
    >
      Install App
    </button>
  );
}