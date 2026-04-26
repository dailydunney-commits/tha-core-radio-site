import Link from "next/link";

const posts: Record<string, { title: string; author: string; date: string; body: string[] }> = {
  "how-small-businesses-can-sell-faster-with-simple-offers": {
    title: "How Small Businesses Can Sell Faster With Simple Offers",
    author: "Tha Core Business Desk",
    date: new Date().toDateString(),
    body: [
      "Small businesses sell faster when the offer is clear, simple, and easy to act on.",
      "A customer should know what you sell, how much it costs, how to order, and how fast they can get it.",
      "Tha Core helps turn attention into action by connecting products, radio promotion, WhatsApp ordering, and strong visuals."
    ],
  },
  "why-every-local-brand-needs-a-website": {
    title: "Why Every Local Brand Needs A Website",
    author: "Tha Core Business Desk",
    date: new Date().toDateString(),
    body: [
      "A website gives your brand a serious home online.",
      "Customers can find your services, prices, contact details, store items, and updates in one place.",
      "For local brands, a website builds trust and makes the business easier to share."
    ],
  },
  "dancehall-reggae-and-the-voice-of-the-people": {
    title: "Dancehall, Reggae, And The Voice Of The People",
    author: "Tha Core Culture Desk",
    date: new Date().toDateString(),
    body: [
      "Dancehall and reggae carry real stories from the streets, families, parties, struggles, and victories.",
      "Tha Core keeps that sound alive by creating space for music, shoutouts, culture, and community voice.",
      "The music is more than entertainment. It is identity, memory, and movement."
    ],
  },
  "how-independent-artists-can-use-radio-promotion": {
    title: "How Independent Artists Can Use Radio Promotion",
    author: "Tha Core Culture Desk",
    date: new Date().toDateString(),
    body: [
      "Independent artists need visibility, repetition, and trusted platforms.",
      "Radio promotion helps introduce a song to listeners and gives the artist a stronger presence.",
      "With the right drop, promo, and timing, artists can build recognition and create demand."
    ],
  },
  "why-flyers-still-work-for-local-business": {
    title: "Why Flyers Still Work For Local Business",
    author: "Tha Core Graphics",
    date: new Date().toDateString(),
    body: [
      "Flyers still work because they are direct, visual, and easy to share.",
      "A strong flyer should show the offer, price, contact number, and reason to act now.",
      "When the design is clean and the message is clear, flyers can bring real customers."
    ],
  },
  "branding-basics-logo-colors-and-consistency": {
    title: "Branding Basics: Logo, Colors, And Consistency",
    author: "Tha Core Graphics",
    date: new Date().toDateString(),
    body: [
      "Branding starts with recognition.",
      "Your logo, colors, fonts, and message should feel consistent wherever people see your business.",
      "That consistency helps customers remember you and trust your brand faster."
    ],
  },
  "building-a-digital-community-around-tha-core": {
    title: "Building A Digital Community Around Tha Core",
    author: "Tha Core Community Desk",
    date: new Date().toDateString(),
    body: [
      "Tha Core is becoming more than a radio station.",
      "It is a place where listeners, creators, customers, and businesses can connect.",
      "The community grows through music, stories, shoutouts, uploads, news, and shared energy."
    ],
  },
  "why-listener-shoutouts-matter": {
    title: "Why Listener Shoutouts Matter",
    author: "Tha Core Community Desk",
    date: new Date().toDateString(),
    body: [
      "A shoutout makes listeners feel seen.",
      "That small moment can turn a visitor into a supporter because it creates real connection.",
      "Radio becomes stronger when people feel like they are part of the movement."
    ],
  },
  "how-tha-core-radio-is-building-a-new-listener-movement": {
    title: "How Tha Core Radio Is Building A New Listener Movement",
    author: "Tha Core Newsroom",
    date: new Date().toDateString(),
    body: [
      "Tha Core Radio is building a new listener movement around music, business, news, culture, and community.",
      "The platform gives people a place to listen, request, shop, read, and connect.",
      "Every new feature makes the movement stronger and more useful for listeners."
    ],
  },
  "why-online-radio-still-matters": {
    title: "Why Online Radio Still Matters",
    author: "Tha Core Newsroom",
    date: new Date().toDateString(),
    body: [
      "Online radio still matters because it gives independent voices a direct channel.",
      "A station can reach listeners anywhere without waiting on traditional media systems.",
      "For Tha Core, online radio is the foundation for a bigger digital platform."
    ],
  },
};

export default function FullBlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = posts[params.slug] || {
    title: "Tha Core Blog Story",
    author: "Tha Core Team",
    date: new Date().toDateString(),
    body: [
      "This full blog story is being prepared.",
      "Tha Core will keep building more stories, updates, and content for visitors."
    ],
  };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/blog/business-tips" className="rounded-2xl bg-red-600 px-5 py-3 font-black hover:bg-red-700">
            ← Back To Business Tips
          </Link>

          <Link href="/blog" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Blog Home
          </Link>

          <Link href="/" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Listen Live
          </Link>
        </div>

        <article className="mt-8 rounded-[2rem] border-2 border-red-600 bg-zinc-950 p-8 shadow-[0_0_45px_rgba(34,197,94,.35)]">
          <p className="text-sm font-black tracking-[0.4em] text-red-400">
            THA CORE BLOG
          </p>

          <h1 className="mt-4 text-5xl font-black md:text-7xl">
            {post.title}
          </h1>

          <p className="mt-4 text-sm font-bold text-gray-400">
            {post.author} • {post.date}
          </p>

          <div className="mt-8 grid gap-5 text-lg leading-8 text-gray-200">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}