export const dynamic = "force-dynamic";
export const revalidate = 900;

const blogData: Record<string, { title: string; posts: { title: string; excerpt: string; author: string; date: string }[] }> = {
  "radio-stories": {
    title: "Radio Stories",
    posts: [
      {
        title: "How Tha Core Radio Is Building A New Listener Movement",
        excerpt: "Tha Core Radio is growing into a home for music, community talk, requests, shoutouts, news, and real listener energy.",
        author: "Tha Core Newsroom",
        date: new Date().toDateString(),
      },
      {
        title: "Why Online Radio Still Matters",
        excerpt: "Online radio gives independent creators a direct way to reach listeners without waiting on traditional gatekeepers.",
        author: "Tha Core Newsroom",
        date: new Date().toDateString(),
      },
    ],
  },
  "business-tips": {
    title: "Business Tips",
    posts: [
      {
        title: "How Small Businesses Can Sell Faster With Simple Offers",
        excerpt: "Clear prices, WhatsApp ordering, product photos, and fast replies can help small businesses turn interest into sales.",
        author: "Tha Core Business Desk",
        date: new Date().toDateString(),
      },
      {
        title: "Why Every Local Brand Needs A Website",
        excerpt: "A website gives customers one place to find your services, contact info, store items, updates, and proof that your brand is serious.",
        author: "Tha Core Business Desk",
        date: new Date().toDateString(),
      },
    ],
  },
  "music-culture": {
    title: "Music & Culture",
    posts: [
      {
        title: "Dancehall, Reggae, And The Voice Of The People",
        excerpt: "Music carries stories, struggle, celebration, and identity. Tha Core keeps that energy alive for listeners everywhere.",
        author: "Tha Core Culture Desk",
        date: new Date().toDateString(),
      },
      {
        title: "How Independent Artists Can Use Radio Promotion",
        excerpt: "A strong radio promo can help artists introduce new songs, build recognition, and connect with fresh audiences.",
        author: "Tha Core Culture Desk",
        date: new Date().toDateString(),
      },
    ],
  },
  "printing-design": {
    title: "Printing & Design",
    posts: [
      {
        title: "Why Flyers Still Work For Local Business",
        excerpt: "A clean flyer with strong contact info, clear pricing, and product photos can still bring real customers to your business.",
        author: "Tha Core Graphics",
        date: new Date().toDateString(),
      },
      {
        title: "Branding Basics: Logo, Colors, And Consistency",
        excerpt: "A strong brand uses the same logo, colors, fonts, and message everywhere so customers remember it quickly.",
        author: "Tha Core Graphics",
        date: new Date().toDateString(),
      },
    ],
  },
  community: {
    title: "Community",
    posts: [
      {
        title: "Building A Digital Community Around Tha Core",
        excerpt: "Tha Core is more than radio. It is a platform for listeners, creators, customers, and businesses to connect.",
        author: "Tha Core Community Desk",
        date: new Date().toDateString(),
      },
      {
        title: "Why Listener Shoutouts Matter",
        excerpt: "Shoutouts make people feel seen. That connection turns casual visitors into loyal supporters.",
        author: "Tha Core Community Desk",
        date: new Date().toDateString(),
      },
    ],
  },
  "behind-the-core": {
    title: "Behind The Core",
    posts: [
      {
        title: "From Idea To Live Platform",
        excerpt: "Tha Core started as a vision and is now becoming a real online radio, store, news, and community platform.",
        author: "Tha Core Team",
        date: new Date().toDateString(),
      },
      {
        title: "What We Are Building Next",
        excerpt: "The next moves include stronger control panel tools, live chat, real uploads, better store checkout, and more listener features.",
        author: "Tha Core Team",
        date: new Date().toDateString(),
      },
    ],
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "radio-stories";
  const page = blogData[category] || blogData["radio-stories"];

  return Response.json({
    category,
    updatedAt: new Date().toISOString(),
    title: page.title,
    posts: page.posts,
  });
}