"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BlogPost = {
  title: string;
  excerpt: string;
  author: string;
  date: string;
};

export default function BlogCategoryPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch("/api/blog?category=music-culture")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []));
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/blog" className="rounded-2xl bg-red-600 px-5 py-3 font-black hover:bg-red-700">
            ← Back To Blog
          </Link>

          <Link href="/" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Listen Live
          </Link>

          <Link href="/news" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            News
          </Link>

          <Link href="/store" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Store
          </Link>
        </div>

        <div className="mt-8 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <p className="text-sm font-black tracking-[0.4em]">THA CORE BLOG</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">Music & Culture</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">
            Live blog posts and stories from Tha Core.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {posts.map((post, index) => (
            <article
              key={post.title + index}
              className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(34,197,94,.35)]"
            >
              <p className="text-sm font-black tracking-[0.3em] text-red-400">
                BLOG POST {index + 1}
              </p>

              <h2 className="mt-3 text-3xl font-black text-white">{post.title}</h2>

              <p className="mt-3 text-gray-300">{post.excerpt}</p>

              <p className="mt-4 text-sm font-bold text-gray-400">
                {post.author} • {post.date}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}