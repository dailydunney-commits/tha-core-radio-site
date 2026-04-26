import Link from "next/link";

const posts: Record<string, { title: string; author: string; date: string; body: string[] }> = {
  "from-idea-to-live-platform": {
    title: "From Idea To Live Platform",
    author: "Tha Core Team",
    date: new Date().toDateString(),
    body: [
      "Tha Core started as a vision and is now becoming a real online radio, store, news, blog, and community platform.",
      "The mission is simple: build one place where listeners, customers, creators, and businesses can connect.",
      "With live radio, shoutouts, news, blog stories, uploads, and store features, Tha Core is moving from idea stage into real digital operation.",
    ],
  },
  "what-we-are-building-next": {
    title: "What We Are Building Next",
    author: "Tha Core Team",
    date: new Date().toDateString(),
    body: [
      "The next moves for Tha Core include stronger admin tools, live chat, real uploads, store checkout, ads, and better listener features.",
      "The goal is to make the platform easier to control from one dashboard.",
      "Every upgrade brings Tha Core closer to becoming a full media, store, and community network.",
    ],
  },
};

export default function FullBlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = posts[params.slug] || posts["from-idea-to-live-platform"];

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/blog/behind-the-core" className="rounded-2xl bg-red-600 px-5 py-3 font-black hover:bg-red-700">
            ← Back To Behind The Core
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