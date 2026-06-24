import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// LOCAL_FULL_SCRIPT_ENGINE_V1
// Free local professional script generator.
// No OpenAI. No ElevenLabs. No external API calls.

const SCRIPT_TYPES = new Set([
  "Radio Ad",
  "Jingle / Drop",
  "Business Promo",
  "Nia Talk Break",
  "Prodigy & Diamond Segment",
  "Sponsor Read",
  "Music Intro",
]);

const TONES = new Set([
  "Clean Jamaican Radio",
  "Professional",
  "Hype",
  "Smooth",
  "Funny",
  "Serious",
]);

const LENGTHS = new Set([
  "15 seconds",
  "30 seconds",
  "60 seconds",
  "90 seconds",
  "3 minutes",
  "5 minutes",
  "15 minutes",
  "30 minutes",
  "60 minutes",
  "2 hours",
  "3 hours",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safeDetails(value: string) {
  return value
    .replace(/\b(fuck|shit|bitch|pussy|dick)\b/gi, "[clean]")
    .slice(0, 1800)
    .trim();
}

function targetWords(length: string) {
  if (length === "15 seconds") return 45;
  if (length === "30 seconds") return 90;
  if (length === "60 seconds") return 160;
  if (length === "90 seconds") return 230;
  if (length === "3 minutes") return 430;
  if (length === "5 minutes") return 720;
  if (length === "15 minutes") return 2100;
  if (length === "30 minutes") return 4200;
  if (length === "60 minutes") return 8200;
  if (length === "2 hours") return 16000;
  if (length === "3 hours") return 24000;
  return 300;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cleanJoin(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toneLine(tone: string) {
  if (tone === "Clean Jamaican Radio") {
    return "Clean Jamaican radio energy. Warm, confident, local, professional, and not overdone.";
  }
  if (tone === "Hype") {
    return "High-energy radio promo delivery. Big presence, clean words, and controlled excitement.";
  }
  if (tone === "Smooth") {
    return "Smooth radio delivery. Calm, stylish, confident, and easy to listen to.";
  }
  if (tone === "Funny") {
    return "Light clean humor with professional timing. Friendly, bright, and still broadcast-ready.";
  }
  if (tone === "Serious") {
    return "Serious trusted delivery. Clear, focused, steady, and professional.";
  }
  return "Professional broadcast delivery. Clean, clear, polished, and ready for voice.";
}

function stationTag() {
  return "Tha Core Online Radio — clean message, real energy, and professional sound.";
}

function shortScript(scriptType: string, details: string, tone: string, length: string) {
  if (scriptType === "Jingle / Drop") {
    return cleanJoin([
      "Tha Core Online Radio!",
      details,
      "Clean music. Real energy. Big vibes for the people locked in from Jamaica to the world.",
      "Keep it right here.",
      stationTag(),
    ]);
  }

  if (scriptType === "Nia Talk Break") {
    return cleanJoin([
      "Good day, family. This is Nia on Tha Core Online Radio.",
      details,
      "Quick reminder: stay focused on the mission, not the noise. Some days move fast, some days test your patience, but progress still counts when you keep showing up.",
      "Protect your peace, handle your business, and keep the standard high.",
      "Stay locked right here with Tha Core Online Radio.",
    ]);
  }

  if (scriptType === "Prodigy & Diamond Segment") {
    return cleanJoin([
      "Prodigy: You’re locked in to Tha Core Online Radio, and today we’re touching something real.",
      `Diamond: Exactly. ${details}`,
      "Prodigy: A lot of people talk about the dream, but the real work is in the discipline, the planning, and the follow-through.",
      "Diamond: And that’s the part that separates noise from progress. You don’t have to be loud to be powerful. You just have to be consistent.",
      "Prodigy: Clean message. Strong mindset. Real movement.",
      "Diamond: Stay close. This is Tha Core Online Radio.",
    ]);
  }

  if (scriptType === "Music Intro") {
    return cleanJoin([
      "You’re tuned in to Tha Core Online Radio.",
      details,
      "We’re keeping the music moving with clean energy for everybody locked in from Montego Bay to Kingston and right across the world.",
      "Turn it up, stay close, and let the next selection set the tone.",
      stationTag(),
    ]);
  }

  return cleanJoin([
    "This is Tha Core Online Radio, and this message is for everybody building a brand, pushing a business, or getting ready to promote something real.",
    details,
    "Make the message clear. Make the look professional. Make the people remember your name.",
    "From flyers and business cards to shirts, cups, banners, signs, logos, and digital promos, Tha Core keeps the energy clean, the message strong, and the brand ready for the road.",
    "Don’t wait until people forget the idea. Put it in front of them, make it look right, and let the promotion work.",
    stationTag(),
  ]);
}

function promoSectionBank(details: string) {
  return [
    `SEGMENT:
Let us start with the real point. A business, a brand, an event, a service, or a movement cannot grow if people do not understand what it is. The message has to be clear. The look has to be clean. The voice has to sound serious. That is where professional promotion comes in. ${details}`,

    `PROMO READ:
When somebody sees a flyer, a business card, a banner, a shirt, a cup, a sign, a logo, or a clean digital post, they are not just seeing design. They are seeing the first impression of the brand. If that first impression is strong, people pay attention. If that first impression is messy, people scroll past, walk past, or forget.`,

    `OWNER TALK:
A lot of people wait too long to promote what they are building. They say they are not ready. They say they want to fix one more thing. But sometimes the business does not need silence. It needs movement. A clean flyer can start the conversation. A radio promo can give the offer a voice. A proper logo can make the brand feel real.`,

    `COMMUNITY CONNECTION:
Big up everybody listening from Montego Bay to Kingston, Spanish Town to Negril, May Pen to Falmouth, and everybody locked in overseas. The same rule applies everywhere. Whether you are building from a small room, a shop front, a laptop, a car trunk, a studio, a kitchen, a salon, or a booth, the world needs to know what you offer.`,

    `BRAND POINT:
Professional design is not just decoration. It is communication. It tells people what you do, who you serve, what you sell, where to find you, and why they should trust you. When the design is clean and the words are right, the customer does not have to guess. They understand faster, and they respond better.`,

    `CALL TO ACTION:
So if you need flyers, business cards, shirts, cups, banners, signs, logos, product promos, menus, digital ads, or radio-ready promotion, this is the moment to move. Get the message ready. Get the design right. Get the voice clean. Put the brand in front of the people and let them remember it.`,

    `RADIO MOMENT:
You are tuned in to Tha Core Online Radio, where the sound stays clean, the message stays strong, and the mission keeps moving. This is not just about playing music. This is about building culture, building business, and giving real people a professional platform to be heard.`,

    `PRACTICAL BREAKDOWN:
Start with the offer. What are you selling? Who is it for? What problem does it solve? What makes it different? How can people contact you? Those five answers can turn a rough idea into a clean promo. Once the message is clear, the design and the voice can carry it further.`,

    `TRUST BUILDER:
People trust what looks organized. They trust what sounds prepared. They trust what feels consistent. A clean brand does not have to be expensive or complicated. It just has to look serious, sound clear, and show up often enough for people to remember it.`,

    `MINDSET SECTION:
Promotion is not begging. Promotion is communication. If you have something valuable, you have a responsibility to let people know. If you can help them, feed them, entertain them, dress them, teach them, transport them, style them, or serve them, then hiding the message does not help anybody.`,

    `LOCAL BUSINESS SECTION:
Think about the barber who needs more bookings, the cook shop that wants more lunch orders, the designer trying to sell custom shirts, the promoter planning an event, the artist pushing a new song, the taxi operator building a route, or the shop owner trying to move products. Every one of them needs a message people can see and remember.`,

    `RADIO PROMO SECTION:
A radio promo gives the brand a voice. It lets the offer move with the listener. Somebody can hear it while driving, cooking, working, cleaning, scrolling, or relaxing. That is why the words must be clean, direct, and easy to remember. A good promo does not confuse people. It points them to the next step.`,

    `DESIGN SECTION:
A flyer should not be overloaded. A business card should not be hard to read. A banner should not hide the important information. A logo should not fight with itself. Clean design gives the eye a path. It helps people know what to read first, what to remember, and what action to take.`,

    `DIGITAL SECTION:
In this time, the phone is a storefront. WhatsApp status, Instagram posts, Facebook flyers, TikTok promos, and digital ads all matter. If the design looks clean on a phone, it can travel fast. If the message is clear in one glance, people are more likely to share it, save it, and respond.`,

    `OWNER STANDARD:
Tha Core is about building something with standards. Not rush work. Not messy work. Not random energy. The goal is clean presentation, strong wording, and professional delivery that can stand up anywhere. Whether the brand is small or growing, it deserves to look and sound serious.`,

    `LISTENER REMINDER:
For everybody listening with an idea in your head, do not let the idea sit down forever. Write it down. Shape the offer. Get the design done. Record the promo. Post the flyer. Tell the people. You do not have to do everything in one day, but you do need to start moving with intention.`,

    `SPONSOR STYLE MOMENT:
This portion of the program is powered by the people who believe in clean promotion, strong branding, and professional sound. Support the businesses that support the culture. When local businesses grow, communities get stronger, families get opportunities, and the movement gets more life.`,

    `RECAP:
The message today is simple. Make the brand clear. Make the design clean. Make the offer easy to understand. Make the contact information easy to find. Make the voice professional. Then keep showing up. Consistency turns a simple promotion into something people start to recognize.`,

    `FINAL PUSH:
If you are ready to stop hiding the brand and start putting it in front of the people, now is the time. Flyers, business cards, cups, shirts, banners, signs, logos, and digital promos can all work together. The message becomes stronger when every piece points in the same direction.`,

    `CLOSING ENERGY:
This is Tha Core Online Radio. We believe in clean sound, real work, strong promotion, and building something that lasts. Keep the music close, keep the message clear, and keep the mission moving.`,
  ];
}

function niaSectionBank(details: string) {
  return [
    `Nia: Good day, family. This is Nia on Tha Core Online Radio, and I want to take a few minutes to reason with you. Today we are talking about this: ${details}`,

    `Nia: Sometimes the day comes with pressure. Bills, plans, family, work, business, music, dreams, responsibilities — all of it can sit on your shoulder at the same time. But pressure does not mean you stop. Pressure means you breathe, slow down, and choose the next right move.`,

    `Nia: The mission still matters. Your peace still matters. Your progress still matters. You do not have to rush to prove anything to anybody. You just have to stay consistent enough that the work starts speaking for you.`,

    `Nia: Big up everybody listening from Montego Bay to Kingston, Spanish Town to Negril, May Pen to Falmouth, Trinidad, the Virgin Islands, New York, New Jersey, Miami, Africa, Haiti, and everywhere the signal is reaching. Wherever you are, your next step still counts.`,

    `Nia: Write the plan down. Make the call. Fix the design. Send the message. Practice the voice. Clean up the idea. Start small if you have to, but start with intention. Small steps done consistently can change the whole direction of your life.`,

    `Nia: Do not let noise trick you into dropping your standard. Some people will not understand what you are building until it starts working. That is okay. Keep moving. Keep learning. Keep your spirit clean and your actions steady.`,

    `Nia: This is your reminder to protect your peace, respect your time, and keep building with purpose. Stay locked to Tha Core Online Radio.`,
  ];
}

function cohostSectionBank(details: string) {
  return [
    `Prodigy: You are locked in to Tha Core Online Radio. Prodigy is here.
Diamond: And Diamond is right here with you. Today we are reasoning on something that matters.
Prodigy: The topic is simple, but it is real: ${details}`,

    `Prodigy: A lot of people want the result, but not everybody respects the process.
Diamond: That is the truth. People see the finished brand, the finished song, the finished business, the finished event, but they do not always see the planning behind it.
Prodigy: The quiet work.
Diamond: The discipline.
Prodigy: The money management.
Diamond: The late nights.
Prodigy: The moments when nobody claps yet, but you still have to show up.`,

    `Diamond: Presentation matters. When you are building something, the way you present it tells people how serious you are.
Prodigy: Facts. If the flyer is messy, people question the event. If the logo is weak, people question the brand. If the message is confusing, people move on.
Diamond: Clean presentation does not mean you are trying to look bigger than you are. It means you respect what you are building.`,

    `Prodigy: Respect is key. Respect the idea enough to organize it. Respect the audience enough to explain it properly. Respect the brand enough to make it clean.
Diamond: That is a word right there.
Prodigy: Because when the world is noisy, a clean message cuts through the noise.`,

    `Diamond: For everybody listening, whatever you are working on, tighten it up.
Prodigy: Fix the wording. Fix the look. Fix the sound. Fix the timing.
Diamond: You do not need to be perfect, but you need to be intentional.
Prodigy: Stop sleeping on your own mission.
Diamond: Stay close. This is Tha Core Online Radio.`,
  ];
}

function buildLongScript(scriptType: string, details: string, tone: string, length: string) {
  const wordsNeeded = targetWords(length);

  let bank = promoSectionBank(details);
  let title = `Tha Core Professional Promo Script — ${length}`;

  if (scriptType === "Nia Talk Break") {
    bank = niaSectionBank(details);
    title = `Nia Talk Break Script — ${length}`;
  }

  if (scriptType === "Prodigy & Diamond Segment") {
    bank = cohostSectionBank(details);
    title = `Prodigy & Diamond Segment Script — ${length}`;
  }

  if (scriptType === "Sponsor Read") {
    title = `Tha Core Sponsor Read Script — ${length}`;
  }

  if (scriptType === "Business Promo") {
    title = `Tha Core Business Promo Script — ${length}`;
  }

  const parts: string[] = [
    `TITLE:\n${title}`,
    `STYLE:\n${toneLine(tone)}`,
    `TARGET LENGTH:\n${length}`,
    `NOTE:\nThis is a full local script draft built without OpenAI or any paid API. Read naturally, with short pauses between sections.`,
    `OPENING:\nWelcome to Tha Core Online Radio. This is where the message stays clean, the energy stays strong, and the mission keeps moving. Today we are building a professional radio-ready script around this focus: ${details}`,
  ];

  let index = 0;
  while (countWords(cleanJoin(parts)) < wordsNeeded) {
    const section = bank[index % bank.length];
    const round = Math.floor(index / bank.length) + 1;
    parts.push(`PART ${index + 1}:\n${section}`);

    if ((index + 1) % 5 === 0) {
      parts.push(
        `MUSIC / STATION BREAK ${round}:\nYou are locked in to Tha Core Online Radio. Keep the volume right, keep the message clear, and stay close. We are coming right back with more clean energy and more real talk.`
      );
    }

    if ((index + 1) % 7 === 0) {
      parts.push(
        `RECAP ${round}:\nLet us bring the message back home. A strong brand needs a clean look, a clear voice, and consistent promotion. Do not hide the work. Shape it, present it, and put it where the people can see it.`
      );
    }

    index += 1;

    if (index > 120) break;
  }

  parts.push(
    `FINAL CLOSE:\nThat is the message from Tha Core Online Radio. Build the brand, push the message, protect the standard, and keep the movement clean. Whether it is flyers, business cards, shirts, cups, banners, signs, logos, sponsor reads, talk breaks, music intros, or full radio promos, the goal is the same: make it clear, make it professional, and make it memorable.`,
    `FINAL TAG:\n${stationTag()}`
  );

  const script = cleanJoin(parts);
  const total = countWords(script);

  return cleanJoin([
    script,
    `ESTIMATED WORD COUNT:\n${total} words.`
  ]);
}


function buildThreeHourShowScript(scriptType: string, details: string, tone: string, length: string) {
  const target = targetWords(length);
  const hours = length === "3 hours" ? 3 : 2;

  const parts: string[] = [
    `TITLE:\nTha Core Long-Form Radio Show Script Package — ${length}`,
    `STYLE:\n${toneLine(tone)}`,
    `FORMAT:\nFull owner-side local script package. No OpenAI. No ElevenLabs. Built for long radio programming with talk, promos, sponsor moments, music breaks, recaps, and clean host energy.`,
    `MAIN TOPIC:\n${details}`,
    `IMPORTANT PRODUCTION NOTE:\nThis script is designed as a long-form radio package. Music break placeholders are included so the full show can run for ${length} without requiring nonstop talking. For voice generation, create voice in parts, not one giant file.`,
  ];

  for (let hour = 1; hour <= hours; hour++) {
    parts.push(
      `\n==================== HOUR ${hour} OPEN ====================`,
      `HOUR ${hour} INTRO:\nYou are locked in to Tha Core Online Radio. This is Hour ${hour} of a clean, professional long-form program built around this focus: ${details}. We are keeping the energy steady, the message clear, and the movement professional from start to finish.`,
      `HOUR ${hour} SETUP:\nBefore we go deeper, remember this: every serious movement needs a strong voice. Whether it is music, business, graphics, printing, digital promotion, radio, or community building, the message has to be clear enough for people to understand and strong enough for people to remember.`,
      `MUSIC BREAK PLACEHOLDER ${hour}.1:\n[PLAY 2 CLEAN SONGS HERE. Keep the energy aligned with the selected show mood. Return with a short station ID.]`,
      `STATION ID ${hour}.1:\nTha Core Online Radio — clean sound, real energy, professional movement. Stay locked in.`
    );

    for (let block = 1; block <= 8; block++) {
      parts.push(
        `HOUR ${hour} TALK BLOCK ${block}:\nLet us reason on the mission. The topic is ${details}. The first thing people need to understand is that promotion is not just noise. Promotion is communication. It is the way a business, a brand, a show, a song, an event, or a service tells the world, “This is what we do, this is why it matters, and this is how you can connect.” When the message is clean, people understand faster. When the design is professional, people trust it more. When the voice is confident, people listen longer.`,

        `HOUR ${hour} BRAND LESSON ${block}:\nA flyer is not just a flyer. A business card is not just a small piece of paper. A shirt is not just something to wear. A cup, cap, banner, sign, logo, menu, digital post, or radio promo can all carry the identity of the brand. That identity must look organized, sound prepared, and feel consistent. If people see confusion, they move away. If people see clarity, they come closer.`,

        `HOUR ${hour} OWNER MESSAGE ${block}:\nTha Core is about building with standards. Not rush work. Not messy work. Not copy-and-paste energy. The goal is clean presentation, strong wording, and professional delivery that can stand up anywhere. Whether the business is small, growing, or already moving, it deserves to look and sound serious.`,

        `HOUR ${hour} COMMUNITY BIG-UP ${block}:\nBig up everybody listening from Montego Bay to Kingston, Spanish Town to Negril, May Pen to Falmouth, Trinidad, the Virgin Islands, New York, New Jersey, Miami, Africa, Haiti, and everybody locked in from wherever the signal reaches. The mission is bigger than one place. The message can travel when it is built right.`,

        `MUSIC BREAK PLACEHOLDER ${hour}.${block + 1}:\n[PLAY 2 TO 3 CLEAN SONGS HERE. Return with host talk. Keep dead air out. Keep transitions smooth.]`,

        `HOUR ${hour} NIA MOMENT ${block}:\nNia: Family, let me remind you of something. The dream does not become real just because we talk about it. It becomes real when we plan, build, test, fix, and keep moving. Protect your peace, but do not hide your purpose. Keep the standard high and keep the work clean.`,

        `HOUR ${hour} PRODIGY AND DIAMOND MOMENT ${block}:\nProdigy: You see it, Diamond? A lot of people have the idea, but they do not package it right.\nDiamond: Exactly. The idea needs structure. It needs a clean look, a strong message, and the confidence to put it in front of the people.\nProdigy: Because if the message is weak, people pass it.\nDiamond: But when it is clear, professional, and consistent, people remember it.\nProdigy: That is the movement. Tha Core Online Radio.`,

        `HOUR ${hour} PROMO READ ${block}:\nFor flyers, business cards, cups, shirts, banners, signs, logos, menus, product promos, digital offers, radio ads, sponsor reads, and clean business promotion, Tha Core Graphics, Printing & Digital Solutions is built to help the message look right and sound right. Build the brand. Push the message. Let the people see it, hear it, and remember it.`,

        `HOUR ${hour} RECAP ${block}:\nLet us bring it back home. A strong brand needs three things: a clean look, a clear voice, and consistent movement. If one of those pieces is missing, the message gets weaker. When all three work together, the brand starts to feel serious.`
      );
    }

    parts.push(
      `HOUR ${hour} CLOSING RECAP:\nThis hour was about clarity, consistency, and professional movement. The message is simple: do not hide the brand. Build it, shape it, clean it up, and put it where the people can see it.`,
      `HOUR ${hour} FINAL MUSIC PLACEHOLDER:\n[PLAY 3 CLEAN SONGS HERE. If continuing to the next hour, return with a fresh intro. If ending the show, go to final close.]`,
      `==================== HOUR ${hour} CLOSE ====================`
    );
  }

  parts.push(
    `FINAL SHOW CLOSE:\nThis has been a long-form Tha Core Online Radio script package built locally with no paid AI provider. The message stays clean. The movement stays focused. The brand stays professional. Keep building, keep promoting, and keep the mission moving.`,
    `FINAL TAG:\n${stationTag()}`
  );

  let script = cleanJoin(parts);
  let count = countWords(script);

  let extra = 1;
  while (count < target && extra <= 80) {
    script += `\n\nEXTENDED FILLER TALK ${extra}:\nHere is the reminder again: the brand has to be clear, the message has to be strong, and the work has to keep moving. Do not wait for perfect conditions. Take the idea, clean it up, give it a voice, give it a look, and present it with confidence. Tha Core Online Radio is about real energy, clean sound, and professional movement for the people building something that matters.`;
    count = countWords(script);
    extra++;
  }

  return cleanJoin([
    script,
    `ESTIMATED WORD COUNT:\n${countWords(script)} words.`,
    `VOICE NOTE:\nFor ${length}, generate voice in parts. Do not voice the full script in one file yet.`
  ]);
}
function buildScript(scriptType: string, details: string, tone: string, length: string) {
  if (length === "2 hours" || length === "3 hours") {
    return buildThreeHourShowScript(scriptType, details, tone, length);
  }

  if (targetWords(length) >= 700) {
    return buildLongScript(scriptType, details, tone, length);
  }

  return shortScript(scriptType, details, tone, length);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const scriptType = clean(body?.scriptType);
    const tone = clean(body?.tone);
    const length = clean(body?.length);
    const details = safeDetails(clean(body?.details));

    if (!details) {
      return NextResponse.json({ ok: false, error: "Details are required." }, { status: 400 });
    }

    if (!SCRIPT_TYPES.has(scriptType)) {
      return NextResponse.json({ ok: false, error: "Invalid script type." }, { status: 400 });
    }

    if (!TONES.has(tone)) {
      return NextResponse.json({ ok: false, error: "Invalid tone." }, { status: 400 });
    }

    if (!LENGTHS.has(length)) {
      return NextResponse.json({ ok: false, error: "Invalid length." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      mode: "free-local-full-script",
      script: buildScript(scriptType, details, tone, length),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to generate local script." }, { status: 500 });
  }
}


