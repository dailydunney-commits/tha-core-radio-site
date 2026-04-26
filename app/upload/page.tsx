"use client";

import Link from "next/link";
import { useState } from "react";

const WHATSAPP_NUMBER = "18768842867";

export default function UploadPage() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [entryType, setEntryType] = useState("Music Submission");
  const [message, setMessage] = useState("");

  const uploadText = encodeURIComponent(
    `THA CORE RADIO UPLOAD ENTRY

Name:
${name || "No name entered"}

WhatsApp:
${whatsapp || "No WhatsApp entered"}

Entry Type:
${entryType}

Message:
${message || "No message entered"}

NOTE:
Visitor should send file/photo/music directly in this WhatsApp chat.

Sent from Tha Core Radio website`
  );

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="font-black text-red-400">
          ← Back Home
        </Link>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black shadow-[0_0_60px_rgba(34,197,94,.7)]">
          <h1 className="text-5xl font-black md:text-7xl">
            Upload Entry
          </h1>

          <p className="mt-4 text-lg font-bold">
            Submit music, photos, contest entries, radio promos, ads, or shoutout material.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_45px_rgba(34,197,94,.55)]">
          <label className="font-black text-red-400">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="mt-2 w-full rounded-xl bg-black p-4"
          />

          <label className="mt-5 block font-black text-red-400">
            WhatsApp Number
          </label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Enter WhatsApp number"
            className="mt-2 w-full rounded-xl bg-black p-4"
          />

          <label className="mt-5 block font-black text-red-400">
            Entry Type
          </label>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="mt-2 w-full rounded-xl bg-black p-4"
          >
            <option>Music Submission</option>
            <option>Photo Contest Entry</option>
            <option>Song Request File</option>
            <option>Radio Promo / Ad Material</option>
            <option>Birthday Shoutout Material</option>
            <option>Business Promo</option>
            <option>Other Upload</option>
          </select>

          <label className="mt-5 block font-black text-red-400">
            Message / Details
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you are sending..."
            className="mt-2 h-40 w-full rounded-xl bg-black p-4"
          />

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${uploadText}`}
            target="_blank"
            className="mt-6 block rounded-xl bg-red-700 px-6 py-4 text-center font-black hover:bg-red-800"
          >
            Send Upload Details To WhatsApp
          </a>

          <div className="mt-6 rounded-2xl bg-black p-5">
            <p className="font-black text-yellow-400">
              After clicking WhatsApp, attach your file, photo, or music directly in the chat.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
