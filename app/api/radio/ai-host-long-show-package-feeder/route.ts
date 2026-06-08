import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_PACKAGE_FEEDER_V1_DRAFT_ONLY";

type ShowKind = "morning-talk-show" | "evening-music-show" | "night-talk-show";

type SegmentType =
  | "opening"
  | "topic-talk"
  | "smartzj-music-break"
  | "music-intro"
  | "music-return-link"
  | "listener-question"
  | "news-teaser"
  | "news-commentary"
  | "sports-commentary"
  | "entertainment-commentary"
  | "artist-spotlight"
  | "local-regional-global"
  | "joke-clean"
  | "money-business"
  | "relationship-life"
  | "community-moment"
  | "ai-future"
  | "recap-close";

type ShowBlock = {
  blockNumber: number;
  startMinute: number;
  durationMinutes: number;
  segmentType: SegmentType;
  title: string;
  hosts: string[];
  purpose: string;
  scriptDirection: string;
  musicInstruction?: string;
  newsInstruction?: string;
  returnRule?: string;
};

type ShowDraft = {
  showId: ShowKind;
  showName: string;
  slot: string;
  lengthMinutes: number;
  hosts: string[];
  format: string;
  newsCutInRule: string;
  musicCutInRule: string;
  smartZjRule: string;
  safety: {
    draftOnly: true;
    voiceStarted: false;
    broadcastStarted: false;
    doesNotTouchNiaNews: true;
    doesNotTouchCurrentBroadcast: true;
    doesNotTouchSmartZJ: true;
  };
  blocks: ShowBlock[];
};

function safety() {
  return {
    draftOnly: true as const,
    voiceStarted: false as const,
    broadcastStarted: false as const,
    doesNotTouchNiaNews: true as const,
    doesNotTouchCurrentBroadcast: true as const,
    doesNotTouchSmartZJ: true as const,
  };
}

function block(
  blockNumber: number,
  startMinute: number,
  durationMinutes: number,
  segmentType: SegmentType,
  title: string,
  hosts: string[],
  purpose: string,
  scriptDirection: string,
  extra?: Partial<ShowBlock>
): ShowBlock {
  return {
    blockNumber,
    startMinute,
    durationMinutes,
    segmentType,
    title,
    hosts,
    purpose,
    scriptDirection,
    ...extra,
  };
}

function buildMorningShow(): ShowDraft {
  const hosts = ["Prodigy", "Diamond"];

  return {
    showId: "morning-talk-show",
    showName: "The Core Morning Kickstart",
    slot: "6:30 AM - 10:00 AM",
    lengthMinutes: 210,
    hosts,
    format:
      "Morning talk show with motivation, discipline, money, life planning, relationships, listener questions, clean jokes, light news/sports/entertainment commentary, and SmartZJ music breaks.",
    newsCutInRule:
      "Nia news is protected. This show may tease upcoming 10 AM news near the end but must not collide with the 10 AM news. If urgent news occurs, pause the show, let Nia deliver the update, then Prodigy and Diamond return with brief respectful commentary.",
    musicCutInRule:
      "SmartZJ can cut in with music breaks between topic blocks. Hosts introduce upcoming music, talk briefly about artists, then return after the music with a clean handoff.",
    smartZjRule:
      "SmartZJ remains the music engine. This draft feeder does not select, advance, clean, voice, or broadcast tracks.",
    safety: safety(),
    blocks: [
      block(1, 0, 10, "opening", "Wake Up And Lock In", hosts, "Open the morning with energy and direction.", "Prodigy opens with calm authority. Diamond adds warmth and humor. Mention the date/time placeholder, welcome the audience, and set the tone: focus, gratitude, discipline, and movement.", {
        returnRule: "Start clean and direct. No long intro loop.",
      }),
      block(2, 10, 15, "topic-talk", "Mission Before Mood", hosts, "Morning motivation and discipline.", "Discuss why feelings cannot be the boss of the day. Use real-life examples for workers, parents, hustlers, creatives, and small business owners."),
      block(3, 25, 10, "smartzj-music-break", "First Music Lift", ["SmartZJ", "Prodigy", "Diamond"], "Let music energize the morning.", "Hosts introduce the music break and mention that SmartZJ is keeping the morning moving.", {
        musicInstruction: "Use clean upbeat morning-friendly music. Hosts should intro the vibe, not choose unsafe tracks.",
        returnRule: "After music, return with a short line and continue the next topic.",
      }),
      block(4, 35, 15, "money-business", "Money Check", hosts, "Practical morning money talk.", "Talk about budgeting, small business pressure, daily income goals, pricing, avoiding waste, and turning skills into money."),
      block(5, 50, 10, "listener-question", "Listener Situation", hosts, "Handle a listener-style question.", "Create a realistic listener question about work, business, relationship pressure, or discipline. Prodigy gives structure; Diamond gives heart and humor."),
      block(6, 60, 15, "news-teaser", "News Coming Up Later", hosts, "Tease upcoming news without replacing Nia.", "Briefly mention that Nia will handle the full news update later. Hosts can tease categories: local, regional, world, sports, entertainment, money, weather-style awareness. Do not pretend to have live facts in draft mode.", {
        newsInstruction: "Use placeholder language: [INSERT FRESH NEWS HEADLINES AT RUNTIME].",
      }),
      block(7, 75, 10, "smartzj-music-break", "Reset Music Break", ["SmartZJ", "Prodigy", "Diamond"], "Give the audience a reset.", "Diamond introduces the break with personality. Prodigy gives a short return-time tease.", {
        musicInstruction: "Clean morning music, positive tempo.",
      }),
      block(8, 85, 15, "relationship-life", "Morning Relationship Reasoning", hosts, "Talk relationships with maturity.", "Discuss communication, respect, pride, apology, money stress, and not carrying yesterday into today."),
      block(9, 100, 15, "sports-commentary", "Sports And Discipline", hosts, "Use sports as life lesson.", "Comment on sports as discipline, teamwork, pressure, preparation, winning and losing. Keep it general unless fresh sports data is injected at runtime."),
      block(10, 115, 10, "joke-clean", "Clean Laugh Break", hosts, "Add humor without getting reckless.", "Diamond leads a clean funny moment. Prodigy plays the straight-man role. No insults, no vulgarity, no protected-class jokes."),
      block(11, 125, 15, "artist-spotlight", "Artist Energy", hosts, "Talk about music culture.", "Discuss artists dead and alive with respect: work ethic, legacy, influence, image, discipline, mistakes, growth. Include local, regional, and international placeholders."),
      block(12, 140, 10, "smartzj-music-break", "Artist-Inspired Music Break", ["SmartZJ", "Prodigy", "Diamond"], "Music break connected to artist talk.", "Hosts introduce upcoming music and invite listeners to stay locked.", {
        musicInstruction: "SmartZJ handles the actual clean track.",
      }),
      block(13, 150, 15, "community-moment", "Community And Family", hosts, "Talk community responsibility.", "Discuss children, elders, community safety, business, education, and why radio should uplift people, not only entertain them."),
      block(14, 165, 15, "ai-future", "Future Ready Morning", hosts, "Morning AI/future preparation.", "Explain how everyday people can prepare for AI, new tools, job changes, creativity, and business opportunities."),
      block(15, 180, 10, "news-teaser", "Approaching 10 AM News", hosts, "Prepare the audience for Nia news.", "Tell listeners Nia will take over for the full news update at 10 AM. Mention that the show is wrapping before the protected news slot.", {
        newsInstruction: "Do not run over Nia. End cleanly before 10 AM.",
      }),
      block(16, 190, 20, "recap-close", "Morning Recap And Handoff", hosts, "Close the morning show.", "Recap the strongest points: discipline, money, relationships, community, future. Close with a natural station line and hand off cleanly to Nia/news or SmartZJ."),
    ],
  };
}

function buildEveningMusicShow(): ShowDraft {
  const hosts = ["Nia", "Prodigy", "Diamond", "SmartZJ"];

  return {
    showId: "evening-music-show",
    showName: "The Core Music Link-Up",
    slot: "4:00 PM - 7:30 PM",
    lengthMinutes: 210,
    hosts,
    format:
      "Evening music show with SmartZJ music rotation, short host links, artist talk, shoutouts, entertainment updates, riddim/genre comments, news/sports/entertainment remarks, and protected Nia 5:30 PM news cut-in.",
    newsCutInRule:
      "If Nia 5:30 PM news is active, this show must pause. SmartZJ/music links stop cleanly, Nia gives the news, then the show resumes with a short host reaction/commentary and returns to music.",
    musicCutInRule:
      "Music is the main body of this show. Hosts speak between songs and blocks, introduce upcoming music, talk on artists, give shoutouts, and return quickly to music.",
    smartZjRule:
      "SmartZJ remains responsible for clean music rotation. This feeder only drafts the show plan and host directions.",
    safety: safety(),
    blocks: [
      block(1, 0, 8, "opening", "Evening Link-Up Open", hosts, "Open the evening music show.", "Nia or Diamond opens bright and clean. Prodigy gives the station authority. SmartZJ is introduced as the music engine."),
      block(2, 8, 12, "music-intro", "First Music Run", ["SmartZJ", "Diamond"], "Start the music flow.", "Diamond introduces the first run of music with energy. Mention local, regional, international flavor.", {
        musicInstruction: "SmartZJ plays clean music. Host speech should be short.",
      }),
      block(3, 20, 10, "artist-spotlight", "Artist Talk One", ["Prodigy", "Diamond"], "Talk about artists and music culture.", "Discuss artist work ethic, legacy, current influence, and respect for artists living and passed on. Use placeholders for real artists at runtime."),
      block(4, 30, 15, "smartzj-music-break", "Music Break", ["SmartZJ"], "Let the music breathe.", "No long host speech. SmartZJ continues clean music rotation.", {
        musicInstruction: "Music-forward block.",
      }),
      block(5, 45, 10, "entertainment-commentary", "Entertainment Pulse", ["Diamond", "Prodigy"], "Short entertainment commentary.", "Talk about entertainment, celebrity culture, image, public pressure, and lessons without gossiping recklessly."),
      block(6, 55, 15, "smartzj-music-break", "Music Run Two", ["SmartZJ"], "Keep the evening moving.", "SmartZJ handles music. Hosts return after the music."),
      block(7, 70, 10, "news-teaser", "5:30 News Coming", ["Nia", "Prodigy", "Diamond"], "Prepare for protected news cut-in.", "Tell listeners Nia news is coming up. Tease local, regional, world, sports, and entertainment headlines using placeholders.", {
        newsInstruction: "Use [INSERT FRESH 5:30 NEWS TEASERS AT RUNTIME].",
      }),
      block(8, 80, 10, "news-commentary", "Pause For Nia News", ["Nia"], "Protected news cut-in window.", "This block marks the protected news interruption. The music show must pause if Nia 5:30 news is active.", {
        newsInstruction: "Nia owns this cut-in. This feeder must not generate or broadcast the actual news here.",
        returnRule: "After news ends, Prodigy and Diamond return with short commentary and go back to music.",
      }),
      block(9, 90, 10, "news-commentary", "After-News Reaction", ["Prodigy", "Diamond"], "Return from news.", "Prodigy gives a calm summary-style reaction. Diamond adds human perspective. Keep it short and return to music."),
      block(10, 100, 15, "smartzj-music-break", "Post-News Music Reset", ["SmartZJ"], "Return audience to music.", "SmartZJ resumes music flow.", {
        musicInstruction: "Use clean music. No raw Azura fallback.",
      }),
      block(11, 115, 10, "sports-commentary", "Sports Link", ["Prodigy", "Diamond"], "Sports and music link.", "Talk about sports energy, competition, discipline, local talent, international moments, and fan culture."),
      block(12, 125, 15, "smartzj-music-break", "Genre Ride", ["SmartZJ"], "Genre-focused music block.", "SmartZJ plays from the scheduled clean lane. Hosts should mention genre/riddim vibe before or after."),
      block(13, 140, 10, "local-regional-global", "Local Regional Global Music", ["Prodigy", "Diamond"], "Connect music across places.", "Talk Jamaica, Caribbean, diaspora, Africa, US, UK, global influence, and how music travels."),
      block(14, 150, 15, "smartzj-music-break", "Shoutout Music Run", ["SmartZJ"], "Music with shoutout energy.", "SmartZJ continues music. Hosts may set up shoutouts before the block."),
      block(15, 165, 10, "listener-question", "Listener Link-Up", ["Prodigy", "Diamond"], "Audience interaction.", "Create listener-style shoutouts/questions about songs, artists, relationships, party memories, or music requests. Remind that requests still go through safety/clean gate."),
      block(16, 175, 15, "smartzj-music-break", "Final Music Run", ["SmartZJ"], "Final long music run.", "Music-forward block before close."),
      block(17, 190, 20, "recap-close", "Evening Close", ["Nia", "Prodigy", "Diamond"], "Close the evening show.", "Recap music highlights, artist respect, news/sports/entertainment mentions, thank listeners, and hand back to SmartZJ or next schedule."),
    ],
  };
}

function buildNightShow(): ShowDraft {
  const hosts = ["Prodigy", "Diamond"];

  return {
    showId: "night-talk-show",
    showName: "The Late Night Reasoning",
    slot: "8:30 PM - 12:00 AM",
    lengthMinutes: 210,
    hosts,
    format:
      "Late-night talk show with grown conversation, relationships, AI/future, money, life, community, listener situations, clean humor, world reflection, entertainment and music culture.",
    newsCutInRule:
      "This show starts after protected 8 PM Nia news. If urgent late news occurs, pause the show, let Nia handle the brief update, then return with calm commentary.",
    musicCutInRule:
      "Use SmartZJ music breaks to reset the conversation. Hosts introduce music, talk about artists and mood, then return to the reasoning.",
    smartZjRule:
      "SmartZJ handles music only. This feeder drafts show structure and host script direction only.",
    safety: safety(),
    blocks: [
      block(1, 0, 10, "opening", "Late Night Open", hosts, "Open the night show.", "Prodigy opens calm and deep. Diamond adds warmth and personality. Set a grown but clean tone."),
      block(2, 10, 15, "relationship-life", "Relationship Reality", hosts, "Start with relatable night topic.", "Talk love, loyalty, communication, pride, boundaries, money pressure, and emotional maturity."),
      block(3, 25, 10, "smartzj-music-break", "Night Music Mood", ["SmartZJ", "Prodigy", "Diamond"], "Let music set the night mood.", "Hosts intro the music as a reset, then return after.", {
        musicInstruction: "Clean night-friendly music.",
      }),
      block(4, 35, 15, "listener-question", "Late Night Listener Situation", hosts, "Handle audience-style problem.", "Create a listener situation about love, trust, money, family, or personal growth. Both hosts respond with balance."),
      block(5, 50, 15, "ai-future", "Humans And AI At Night", hosts, "Deep future conversation.", "Discuss AI, jobs, creativity, privacy, relationships, business, and how everyday people can prepare."),
      block(6, 65, 10, "joke-clean", "Clean Laugh Reset", hosts, "Keep it entertaining.", "Diamond brings a clean joke or funny observation. Prodigy responds dry and witty."),
      block(7, 75, 15, "smartzj-music-break", "Music Break Two", ["SmartZJ"], "Give listeners music.", "SmartZJ plays music. Hosts return after."),
      block(8, 90, 15, "money-business", "Money And Pressure", hosts, "Talk money honestly.", "Discuss bills, business, discipline, side hustles, pricing, avoiding bad spending, and building slowly."),
      block(9, 105, 15, "news-commentary", "World After Dark", hosts, "Comment on world topics without pretending fresh data.", "Use placeholder fresh headline slots for local, regional, international, sports, and entertainment. Hosts give human commentary after the facts are inserted.", {
        newsInstruction: "Use [INSERT FRESH LATE NEWS BRIEF IF AVAILABLE]. Nia owns official news updates.",
      }),
      block(10, 120, 10, "artist-spotlight", "Artists Dead And Alive", hosts, "Respect music legacy.", "Talk about artists living and passed on, lessons from fame, discipline, creativity, pressure, and legacy."),
      block(11, 130, 15, "smartzj-music-break", "Legacy Music Break", ["SmartZJ"], "Music connected to artist talk.", "SmartZJ plays clean music from the schedule lane."),
      block(12, 145, 15, "community-moment", "Community Reasoning", hosts, "Bring the conversation home.", "Talk youth, elders, violence prevention, opportunity, education, entrepreneurship, and how radio can help build better thinking."),
      block(13, 160, 15, "entertainment-commentary", "Entertainment With Sense", hosts, "Entertainment but with maturity.", "Talk about celebrity news, fashion, image, viral culture, and how people can enjoy entertainment without losing themselves."),
      block(14, 175, 10, "smartzj-music-break", "Final Night Music Reset", ["SmartZJ"], "Last music reset before close.", "SmartZJ plays clean music. Hosts return for closing reasoning."),
      block(15, 185, 25, "recap-close", "Late Night Closing Reasoning", hosts, "Close the show properly.", "Recap relationships, money, AI/future, community, entertainment, and personal growth. Thank listeners. Close with calm strength and a natural Tha Core station line."),
    ],
  };
}

function totalBlockMinutes(blocks: ShowBlock[]) {
  return blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
}

export async function GET() {
  const packageId = `long-show-package-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto
    .randomBytes(4)
    .toString("hex")}`;

  const shows = [buildMorningShow(), buildEveningMusicShow(), buildNightShow()];

  const validation = shows.map((show) => ({
    showId: show.showId,
    showName: show.showName,
    slot: show.slot,
    targetMinutes: show.lengthMinutes,
    plannedMinutes: totalBlockMinutes(show.blocks),
    meetsTarget: totalBlockMinutes(show.blocks) === show.lengthMinutes,
    blockCount: show.blocks.length,
  }));

  const payload = {
    ok: true,
    phase: PHASE,
    packageId,
    createdAt: new Date().toISOString(),
    dailyHostedProgrammingMinutes: 630,
    dailyHostedProgrammingHours: 10.5,
    approvalStatus: "DRAFT_NEEDS_OWNER_APPROVAL",
    draftOnly: true,
    voiceStarted: false,
    broadcastStarted: false,
    doesNotTouchNiaNews: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
    packageRules: {
      niaNewsProtected: true,
      newsCanCutIn: true,
      upcomingNewsBriefsAllowed: true,
      hostsCanCommentAfterNews: true,
      musicCanCutInAndOut: true,
      smartZjHandlesMusic: true,
      hostsIntroduceUpcomingMusic: true,
      artistTalkAllowed:
        "Hosts may discuss artists dead and alive, local, regional, international, and global, respectfully and cleanly.",
      listenerInteractionAllowed: true,
      cleanHumorOnly: true,
      noVoiceGenerationInThisRoute: true,
      noBroadcastInThisRoute: true,
    },
    validation,
    shows,
  };

  const outDir = path.join(process.cwd(), ".data", "ai-host-long-show-packages");
  await mkdir(outDir, { recursive: true });

  const fileName = `${packageId}.json`;
  const filePath = path.join(outDir, fileName);

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

  return NextResponse.json({
    ...payload,
    savedFile: fileName,
    savedPath: filePath,
  });
}
